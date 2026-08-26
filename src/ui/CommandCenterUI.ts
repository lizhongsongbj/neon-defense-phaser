import type Phaser from 'phaser'
import { MAP_LEVELS, CAMPAIGN_THREAT_LEVELS, CAMPAIGN_WAVE_COUNTS, CAMPAIGN_ENEMY_COUNTS, CAMPAIGN_STARTING_COINS } from '../data/maps'
import { TOWER_TYPES } from '../data/towers'
import { EXPANSION_TOWERS, GROWTH_TOWER_IDS, type AllTowerId } from '../data/towerExpansion'
import type { Difficulty } from '../data/balance'
import { growthUpgradeCost } from '../systems/Economy'
import { CampaignState } from '../state/CampaignState'
import { MUSIC_REGISTRY_KEY, VOICE_REGISTRY_KEY, type MusicController, type VoiceSystem } from '../audio'
import { MAX_PLAYER_SKILL_LEVEL, PLAYER_SKILLS, playerSkillCooldown, playerSkillUpgradeCost, type PlayerSkillId } from '../data/playerSkills'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', normal: '标准', hard: '困难' }
const STATUS_LABEL: Record<'cleared' | 'online' | 'locked', string> = { cleared: 'CLEARED', online: 'ONLINE', locked: 'LOCKED' }
const MAX_GROWTH_LEVEL = 3
const CAMPAIGN_NODE_POSITIONS = [
  { x: 11, y: 31 },
  { x: 27, y: 25 },
  { x: 45, y: 23 },
  { x: 22, y: 53 },
  { x: 47, y: 54 },
  { x: 71, y: 25 },
  { x: 76, y: 48 },
  { x: 89, y: 49 },
] as const

type CampaignLightParticle = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
  maxLife: number
  hue: number
  phase: number
}

type CampaignLightPoint = { x: number; y: number; weight: number }

const GROWTH_TOWER_TYPES = [
  ...TOWER_TYPES,
  ...EXPANSION_TOWERS.map((tower) => ({
    id: tower.id,
    name: tower.name,
    cost: tower.buildCost,
    accent: tower.accent,
    role: tower.role,
    image: tower.image,
  })),
] as const

/**
 * 指挥中心 UI(HTML+CSS),对应原版 #command-center。
 * 取代旧的 Phaser 版 CommandCenterScene —— 结构/文案尽量贴近原版的
 * mission-rail / mission-brief / growth-panel(战区节点 / DEPLOY / 塔楼成长矩阵)。
 */
export class CommandCenterUI {
  private readonly el: HTMLElement
  private readonly missionList: HTMLElement
  private readonly visualImg: HTMLImageElement
  private readonly codeEl: HTMLElement
  private readonly titleEl: HTMLElement
  private readonly metaEl: HTMLElement
  private readonly difficultyEl: HTMLElement
  private readonly deployButton: HTMLButtonElement
  private readonly testUnlockButton: HTMLButtonElement
  private readonly researchPointsEl: HTMLElement
  private readonly growthTotalEl: HTMLElement
  private readonly growthGrid: HTMLElement
  private readonly skillGrowthGrid: HTMLElement
  private readonly closeButton: HTMLButtonElement
  private readonly voiceToggle: HTMLButtonElement
  private readonly musicToggle: HTMLButtonElement
  private readonly tabs: HTMLButtonElement[]
  private readonly panels: Record<string, HTMLElement>
  private readonly particleCanvas: HTMLCanvasElement
  private readonly particleContext: CanvasRenderingContext2D | null
  private readonly campaignMap: HTMLElement
  private readonly campaignBackdrop: HTMLElement
  private readonly particles: CampaignLightParticle[] = []
  private lightPoints: CampaignLightPoint[] = []
  private particleFrame = 0
  private particleLastTime = 0
  private particleSpawnCarry = 0
  private particleWidth = 0
  private particleHeight = 0
  private readonly particleResizeObserver: ResizeObserver
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  private selectedMapIndex = 0
  private selectedDifficulty: Difficulty = 'normal'
  private assetsReady = false
  private testUnlockActive = false
  private loadoutDialog!: HTMLElement
  private loadoutGrid!: HTMLElement
  private loadoutCount!: HTMLElement
  private pendingLoadout: AllTowerId[] = []

  constructor(
    private readonly campaign: CampaignState,
    private readonly game: Phaser.Game,
    private readonly onDeploy: (mapIndex: number, difficulty: Difficulty, towerIds: AllTowerId[]) => void,
    private readonly onExitToTitle: () => void,
  ) {
    this.el = document.getElementById('command-center') as HTMLElement
    this.missionList = document.getElementById('mission-list') as HTMLElement
    this.visualImg = document.getElementById('mission-preview') as HTMLImageElement
    this.codeEl = document.getElementById('mission-code') as HTMLElement
    this.titleEl = document.getElementById('mission-title') as HTMLElement
    this.metaEl = document.getElementById('mission-meta') as HTMLElement
    this.difficultyEl = document.getElementById('mission-difficulty') as HTMLElement
    this.deployButton = document.getElementById('deploy-mission') as HTMLButtonElement
    this.testUnlockButton = document.getElementById('test-unlock-maps') as HTMLButtonElement
    this.researchPointsEl = document.getElementById('research-points') as HTMLElement
    this.growthTotalEl = document.getElementById('growth-total') as HTMLElement
    this.growthGrid = document.getElementById('growth-grid') as HTMLElement
    this.skillGrowthGrid = document.getElementById('skill-growth-grid') as HTMLElement
    this.closeButton = document.getElementById('command-close') as HTMLButtonElement
    this.voiceToggle = document.getElementById('hud-toggle-voice') as HTMLButtonElement
    this.musicToggle = document.getElementById('hud-toggle-music') as HTMLButtonElement
    this.tabs = Array.from(this.el.querySelectorAll('[data-command-tab]'))
    this.panels = {
      missions: this.el.querySelector('[data-command-panel="missions"]') as HTMLElement,
      growth: this.el.querySelector('[data-command-panel="growth"]') as HTMLElement,
    }
    this.particleCanvas = document.getElementById('campaign-light-particles') as HTMLCanvasElement
    this.particleContext = this.particleCanvas.getContext('2d')
    this.campaignMap = this.particleCanvas.parentElement as HTMLElement
    this.campaignBackdrop = this.campaignMap.querySelector('.campaign-map__backdrop') as HTMLElement
    this.particleResizeObserver = new ResizeObserver(() => this.resizeParticleCanvas())
    this.particleResizeObserver.observe(this.campaignMap)
    void this.buildLightPointMap()

    // 新进入游戏时始终从第一个地图开始显示，存档进度不会改变默认选中项。
    this.selectedMapIndex = 0
    this.selectedDifficulty = campaign.difficulty
    this.buildLoadoutDialog()

    this.buildMissionList()
    this.buildDifficultyButtons()
    this.buildGrowthGrid()
    this.buildSkillGrowthGrid()
    this.bindTabs()
    this.bindDeploy()
    this.bindTestUnlock()
    this.bindClose()
    this.bindAudioToggles()
  }

  show() {
    this.el.hidden = false
    this.music()?.startMenu()
    this.syncAudioLabels()
    this.refresh()
    this.startLightParticles()
  }

  hide() {
    this.el.hidden = true
    this.stopLightParticles()
  }

  private resizeParticleCanvas() {
    const rect = this.campaignMap.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    if (width === this.particleWidth && height === this.particleHeight) return

    this.particleWidth = width
    this.particleHeight = height
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.particleCanvas.width = Math.round(width * dpr)
    this.particleCanvas.height = Math.round(height * dpr)
    this.particleCanvas.style.width = `${width}px`
    this.particleCanvas.style.height = `${height}px`
    this.particleContext?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  private async buildLightPointMap() {
    const background = getComputedStyle(this.campaignBackdrop).backgroundImage
    const source = background.match(/url\(["']?(.*?)["']?\)/)?.[1]
    if (!source) return

    try {
      const image = new Image()
      image.decoding = 'async'
      image.src = source
      await image.decode()

      const sample = document.createElement('canvas')
      sample.width = 160
      sample.height = 90
      const context = sample.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.drawImage(image, 0, 0, sample.width, sample.height)
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data
      const points: CampaignLightPoint[] = []

      for (let y = 2; y < sample.height - 2; y += 2) {
        for (let x = 2; x < sample.width - 2; x += 2) {
          const offset = (y * sample.width + x) * 4
          const red = pixels[offset]
          const green = pixels[offset + 1]
          const blue = pixels[offset + 2]
          const luminance = red * .2126 + green * .7152 + blue * .0722
          const chroma = Math.max(red, green, blue) - Math.min(red, green, blue)
          const lightWeight = Math.max(0, luminance - 104) + Math.max(0, chroma - 38) * .45
          if (lightWeight > 12) points.push({ x: x / sample.width, y: y / sample.height, weight: lightWeight })
        }
      }
      this.lightPoints = points
    } catch {
      this.lightPoints = [
        { x: .2, y: .58, weight: 1 }, { x: .38, y: .43, weight: 1 },
        { x: .57, y: .5, weight: 1 }, { x: .73, y: .38, weight: 1 }, { x: .84, y: .56, weight: 1 },
      ]
    }
  }

  private startLightParticles() {
    this.resizeParticleCanvas()
    if (this.reducedMotion.matches || this.particleFrame) return
    this.particleLastTime = performance.now()
    this.particleFrame = requestAnimationFrame(this.animateLightParticles)
  }

  private stopLightParticles() {
    if (this.particleFrame) cancelAnimationFrame(this.particleFrame)
    this.particleFrame = 0
    this.particleLastTime = 0
    this.particleSpawnCarry = 0
    this.particles.length = 0
    this.particleContext?.clearRect(0, 0, this.particleWidth, this.particleHeight)
  }

  private readonly animateLightParticles = (time: number) => {
    const context = this.particleContext
    if (!context || this.el.hidden || this.reducedMotion.matches) {
      this.stopLightParticles()
      return
    }

    const delta = Math.min(40, Math.max(0, time - this.particleLastTime)) / 1000
    this.particleLastTime = time
    this.particleSpawnCarry += delta * 28
    while (this.particleSpawnCarry >= 1 && this.particles.length < 150) {
      this.spawnLightParticle()
      this.particleSpawnCarry -= 1
    }

    context.clearRect(0, 0, this.particleWidth, this.particleHeight)
    context.save()
    context.globalCompositeOperation = 'lighter'
    for (let index = this.particles.length - 1; index >= 0; index--) {
      const particle = this.particles[index]
      particle.life -= delta
      if (particle.life <= 0 || particle.y < -20) {
        this.particles.splice(index, 1)
        continue
      }

      particle.phase += delta * 2.2
      particle.x += (particle.vx + Math.sin(particle.phase) * 4) * delta
      particle.y += particle.vy * delta
      const progress = 1 - particle.life / particle.maxLife
      const alpha = Math.sin(Math.PI * progress) * .95
      const tail = Math.max(5, Math.abs(particle.vy) * .12)
      const gradient = context.createLinearGradient(particle.x, particle.y, particle.x, particle.y + tail)
      gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 82%, ${alpha})`)
      gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 65%, 0)`)
      context.strokeStyle = gradient
      context.lineWidth = Math.max(.6, particle.radius * .65)
      context.beginPath()
      context.moveTo(particle.x, particle.y)
      context.lineTo(particle.x - particle.vx * .04, particle.y + tail)
      context.stroke()

      context.shadowBlur = 8 + particle.radius * 3
      context.shadowColor = `hsla(${particle.hue}, 100%, 70%, ${alpha})`
      context.fillStyle = `hsla(${particle.hue}, 100%, 88%, ${alpha})`
      context.beginPath()
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      context.fill()
      context.shadowBlur = 0
    }
    context.restore()
    this.particleFrame = requestAnimationFrame(this.animateLightParticles)
  }

  private spawnLightParticle() {
    const point = this.pickLightPoint()
    const x = point ? point.x * this.particleWidth : (.12 + Math.random() * .76) * this.particleWidth
    const y = point ? point.y * this.particleHeight : (.28 + Math.random() * .45) * this.particleHeight
    const maxLife = 2.1 + Math.random() * 2.5
    this.particles.push({
      x: x + (Math.random() - .5) * 20,
      y: y + (Math.random() - .5) * 12,
      vx: (Math.random() - .5) * 9,
      vy: -(24 + Math.random() * 30),
      radius: .8 + Math.random() * 1.8,
      life: maxLife,
      maxLife,
      hue: Math.random() < .7 ? 184 + Math.random() * 12 : 48 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
    })
  }

  private pickLightPoint() {
    if (!this.lightPoints.length) return undefined
    let total = 0
    for (const point of this.lightPoints) total += point.weight
    let target = Math.random() * total
    for (const point of this.lightPoints) {
      target -= point.weight
      if (target <= 0) return point
    }
    return this.lightPoints[this.lightPoints.length - 1]
  }

  markAssetsReady() {
    this.assetsReady = true
    this.refresh()
  }

  private music(): MusicController | undefined {
    return this.game.registry.get(MUSIC_REGISTRY_KEY) as MusicController | undefined
  }

  private voice(): VoiceSystem | undefined {
    return this.game.registry.get(VOICE_REGISTRY_KEY) as VoiceSystem | undefined
  }

  private bindAudioToggles() {
    this.voiceToggle.addEventListener('click', () => {
      this.voice()?.toggle()
      this.syncAudioLabels()
    })
    this.musicToggle.addEventListener('click', () => {
      this.music()?.toggle()
      this.syncAudioLabels()
    })
  }

  private syncAudioLabels() {
    this.voiceToggle.setAttribute('aria-pressed', String(!this.voice()?.muted))
    this.musicToggle.setAttribute('aria-pressed', String(!this.music()?.muted))
  }
  private bindTabs() {
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.commandTab as string
        this.tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)))
        Object.entries(this.panels).forEach(([key, panel]) => {
          panel.hidden = key !== target
        })
      })
    })
  }

  private bindClose() {
    this.closeButton.addEventListener('click', () => this.onExitToTitle())
  }

  private buildMissionList() {
    MAP_LEVELS.forEach((map, index) => {
      const row = document.createElement('button')
      const position = CAMPAIGN_NODE_POSITIONS[index] ?? { x: 50, y: 50 }
      row.type = 'button'
      row.className = 'mission-row'
      row.style.setProperty('--node-x', `${position.x}%`)
      row.style.setProperty('--node-y', `${position.y}%`)
      row.setAttribute('aria-label', `关卡 ${index + 1}：${map.name}`)
      const code = String(index + 1).padStart(2, '0')
      row.innerHTML = `
        <span class="mission-row__crest" aria-hidden="true">
          <span class="mission-row__number">${code}</span>
          <span class="mission-row__lock">◆</span>
        </span>
        <span class="mission-row__stars" aria-hidden="true"><i>★</i><i>★</i><i>★</i></span>
        <span class="mission-row__copy">
          <b>${map.name}</b>
          <small>${map.available ? `${CAMPAIGN_WAVE_COUNTS[index]} 波防御` : '等待地图数据'}</small>
        </span>
        <em data-role="status"></em>
      `
      row.addEventListener('click', () => {
        // Locked stages remain previewable on the right, but deployment stays disabled.
        this.selectedMapIndex = index
        this.refresh()
      })
      this.missionList.appendChild(row)
    })
  }

  private buildDifficultyButtons() {
    const difficulties: Difficulty[] = ['easy', 'normal', 'hard']
    difficulties.forEach((diff) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'neon-chip'
      btn.dataset.diff = diff
      btn.textContent = DIFFICULTY_LABEL[diff]
      btn.addEventListener('click', () => {
        this.selectedDifficulty = diff
        this.refresh()
      })
      this.difficultyEl.appendChild(btn)
    })
  }

  private buildGrowthGrid() {
    GROWTH_TOWER_TYPES.forEach((def) => {
      const card = document.createElement('div')
      card.className = 'growth-card'
      card.style.setProperty('--growth-accent', def.accent)
      card.innerHTML = `
        <div class="growth-card__art"><img src="${def.image}" alt="${def.name}" /></div>
        <div class="growth-card__body">
          <small data-role="augment">AUGMENT // 00</small>
          <h3>${def.name}</h3>
          <p>${def.role}</p>
        </div>
        <div class="growth-card__stats">
          <div>伤害 <b data-role="damage">+0%</b></div>
          <div>射程 <b data-role="range">+0%</b></div>
        </div>
        <div class="growth-level"><i></i><i></i><i></i></div>
        <button class="growth-upgrade" type="button" data-tower="${def.id}"></button>
      `
      const upgradeBtn = card.querySelector('.growth-upgrade') as HTMLButtonElement
      upgradeBtn.addEventListener('click', () => this.tryUpgradeGrowth(def.id))
      this.growthGrid.appendChild(card)
    })
  }

  private buildSkillGrowthGrid() {
    PLAYER_SKILLS.forEach((skill) => {
      const card = document.createElement('article')
      card.className = 'skill-growth-card'
      card.dataset.skill = skill.id
      card.style.setProperty('--skill-accent', skill.accent)
      card.innerHTML = `
        <div class="skill-growth-card__icon" aria-hidden="true">${skill.icon}</div>
        <div class="skill-growth-card__body">
          <small>${skill.code}</small>
          <h3>${skill.name}</h3>
          <p>${skill.description}</p>
          <b>${skill.effect}</b>
        </div>
        <div class="skill-growth-card__status">
          <span data-role="skill-state">LOCKED</span>
          <strong data-role="skill-cd">CD --</strong>
          <div class="skill-growth-level"><i></i><i></i><i></i></div>
          <button type="button" data-role="skill-upgrade"></button>
        </div>
      `
      ;(card.querySelector('[data-role="skill-upgrade"]') as HTMLButtonElement).addEventListener('click', () => this.tryUpgradeSkill(skill.id))
      this.skillGrowthGrid.appendChild(card)
    })
  }

  private tryUpgradeSkill(id: PlayerSkillId) {
    const level = this.campaign.playerSkillLevel(id)
    if (level >= MAX_PLAYER_SKILL_LEVEL) return
    const cost = playerSkillUpgradeCost(id, level)
    if (this.campaign.researchPoints < cost) return
    this.campaign.researchPoints -= cost
    this.campaign.playerSkillLevels[id] = level + 1
    this.campaign.persist()
    this.refresh()
  }

  private tryUpgradeGrowth(id: AllTowerId) {
    const level = this.campaign.towerGrowthBonus(id)
    if (level >= MAX_GROWTH_LEVEL) return
    const cost = growthUpgradeCost(level)
    if (this.campaign.researchPoints < cost) return
    this.campaign.researchPoints -= cost
    this.campaign.towerGrowth[id] = level + 1
    this.campaign.persist()
    this.refresh()
  }

  private buildLoadoutDialog() {
    this.loadoutDialog = document.createElement('section')
    this.loadoutDialog.className = 'tower-loadout-dialog'
    this.loadoutDialog.hidden = true
    this.loadoutDialog.innerHTML = `
      <div class="tower-loadout-dialog__backdrop"></div>
      <div class="tower-loadout-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="tower-loadout-title">
        <div class="tower-loadout-dialog__head"><div><small>DEPLOYMENT LOADOUT</small><h2 id="tower-loadout-title">选择本局携带的防御塔</h2></div><b id="tower-loadout-count">0 / 5</b></div>
        <p class="tower-loadout-dialog__hint">一局只能携带五种防御塔。点击卡片自由编组，确认后进入战区。</p>
        <div class="tower-loadout-grid" id="tower-loadout-grid"></div>
        <div class="tower-loadout-dialog__actions"><button type="button" data-loadout-cancel>取消</button><button type="button" data-loadout-confirm>确认编组并部署</button></div>
      </div>`
    this.el.appendChild(this.loadoutDialog)
    this.loadoutGrid = this.loadoutDialog.querySelector('#tower-loadout-grid') as HTMLElement
    this.loadoutCount = this.loadoutDialog.querySelector('#tower-loadout-count') as HTMLElement
    this.loadoutDialog.querySelector('[data-loadout-cancel]')?.addEventListener('click', () => { this.loadoutDialog.hidden = true })
    this.loadoutDialog.querySelector('.tower-loadout-dialog__backdrop')?.addEventListener('click', () => { this.loadoutDialog.hidden = true })
    this.loadoutDialog.querySelector('[data-loadout-confirm]')?.addEventListener('click', () => {
      if (this.pendingLoadout.length !== 5) return
      this.campaign.setTowerLoadout(this.pendingLoadout)
      this.loadoutDialog.hidden = true
      this.onDeploy(this.selectedMapIndex, this.selectedDifficulty, this.pendingLoadout)
    })
  }

  private openLoadoutDialog() {
    this.pendingLoadout = [...this.campaign.selectedTowerIds]
    this.loadoutGrid.replaceChildren(...GROWTH_TOWER_TYPES.map((def) => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'tower-loadout-card'
      card.dataset.tower = def.id
      card.innerHTML = `<img src="${def.image}" alt="${def.name}" /><span><strong>${def.name}</strong><small>${def.role}</small></span><i>✓</i>`
      card.classList.toggle('is-selected', this.pendingLoadout.includes(def.id))
      card.addEventListener('click', () => {
        const index = this.pendingLoadout.indexOf(def.id)
        if (index >= 0) this.pendingLoadout.splice(index, 1)
        else if (this.pendingLoadout.length < 5) this.pendingLoadout.push(def.id)
        this.loadoutGrid.querySelectorAll<HTMLElement>('[data-tower]').forEach((item) => item.classList.toggle('is-selected', this.pendingLoadout.includes(item.dataset.tower as AllTowerId)))
        this.loadoutCount.textContent = `${this.pendingLoadout.length} / 5`
      })
      return card
    }))
    this.loadoutCount.textContent = `${this.pendingLoadout.length} / 5`
    this.loadoutDialog.hidden = false
  }

  private bindDeploy() {
    this.deployButton.addEventListener('click', () => {
      if (!this.assetsReady) return
      this.openLoadoutDialog()
    })
  }

  private bindTestUnlock() {
    this.testUnlockButton.addEventListener('click', () => {
      this.testUnlockActive = true
      this.testUnlockButton.setAttribute('aria-pressed', 'true')
      this.testUnlockButton.disabled = true
      this.testUnlockButton.querySelector('strong')!.textContent = '全部关卡已解锁'
      this.refresh()
    })
  }

  refresh() {
    const rows = Array.from(this.missionList.querySelectorAll<HTMLButtonElement>('.mission-row'))
    rows.forEach((row, index) => {
      const status = this.campaign.completedMaps[index]
        ? 'cleared'
        : this.testUnlockActive
          ? 'online'
          : this.campaign.mapStatus(index)
      row.dataset.status = status
      row.setAttribute('aria-selected', String(index === this.selectedMapIndex))
      const statusEl = row.querySelector('[data-role="status"]') as HTMLElement
      statusEl.textContent = MAP_LEVELS[index].available ? STATUS_LABEL[status] : 'RENOVATION'
    })

    Array.from(this.difficultyEl.querySelectorAll<HTMLButtonElement>('button')).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.diff === this.selectedDifficulty)
    })

    const map = MAP_LEVELS[this.selectedMapIndex]
    const unlocked = this.testUnlockActive || this.campaign.isMapUnlocked(this.selectedMapIndex)
    const code = String(this.selectedMapIndex + 1).padStart(2, '0')
    this.visualImg.hidden = !map.available
    this.visualImg.parentElement?.classList.toggle('mission-visual--empty', !map.available)
    if (map.available) {
      this.visualImg.src = map.image
      this.visualImg.alt = map.name
    } else {
      this.visualImg.removeAttribute('src')
      this.visualImg.alt = ''
    }
    this.codeEl.textContent = `SECTOR ${code} // ${map.available ? 'ONLINE' : 'RENOVATION'}`
    this.titleEl.textContent = map.name
    this.metaEl.innerHTML = map.available
      ? `
        <span class="map-access-note${unlocked ? ' is-online' : ' is-locked'}">${unlocked ? '可部署战区' : '未解锁 · 需要先通关上一关'}</span>
        <span>威胁系数 <b>${CAMPAIGN_THREAT_LEVELS[this.selectedMapIndex].toFixed(2)}</b></span>
        <span>关卡波次 <b>${CAMPAIGN_WAVE_COUNTS[this.selectedMapIndex]}</b></span>
        <span>敌军种类 <b>${CAMPAIGN_ENEMY_COUNTS[this.selectedMapIndex]}</b></span>
        <span>防御节点 <b>${map.slots.length}</b></span>
        <span>入口 / 路径 <b>${map.entranceRoutes.length} / ${map.entranceRoutes.length}</b></span>
        <span>初始金币 <b>${CAMPAIGN_STARTING_COINS[this.selectedMapIndex]}</b></span>
        <span class="menu-save-status">网页版战区已就绪</span>
      `
      : `
        <span>地图美术 <b>待接入</b></span>
        <span>路线数据 <b>待重做</b></span>
        <span>防御节点 <b>待重做</b></span>
        <span>部署状态 <b>已暂停</b></span>
        <span class="menu-save-status">等待新版地图</span>
      `

    this.deployButton.disabled = !map.available || !unlocked || !this.assetsReady
    this.deployButton.textContent = !map.available ? '地图翻修中 // 暂停部署' : !this.assetsReady ? '资源加载中…' : !unlocked ? '未解锁' : 'DEPLOY // 进入战区'

    this.researchPointsEl.textContent = String(this.campaign.researchPoints)
    const growthTotal = GROWTH_TOWER_IDS.reduce((sum, id) => sum + this.campaign.towerGrowthBonus(id), 0)
    this.growthTotalEl.textContent = String(growthTotal).padStart(2, '0')

    PLAYER_SKILLS.forEach((skill) => {
      const card = this.skillGrowthGrid.querySelector<HTMLElement>(`[data-skill="${skill.id}"]`)!
      const level = this.campaign.playerSkillLevel(skill.id)
      card.classList.toggle('is-locked', level === 0)
      card.querySelectorAll<HTMLElement>('.skill-growth-level i').forEach((bar, index) => bar.classList.toggle('active', index < level))
      ;(card.querySelector('[data-role="skill-state"]') as HTMLElement).textContent = level === 0 ? 'LOCKED // 未解锁' : `PROTOCOL LV.${level}`
      ;(card.querySelector('[data-role="skill-cd"]') as HTMLElement).textContent = level === 0 ? 'CD --' : `CD ${playerSkillCooldown(skill.id, level)} 秒`
      const button = card.querySelector('[data-role="skill-upgrade"]') as HTMLButtonElement
      if (level >= MAX_PLAYER_SKILL_LEVEL) {
        button.textContent = '协议已满级'
        button.disabled = true
      } else {
        const cost = playerSkillUpgradeCost(skill.id, level)
        button.textContent = level === 0 ? `解锁 · ${cost} 研发点` : `缩短冷却 · ${cost} 研发点`
        button.disabled = this.campaign.researchPoints < cost
      }
    })

    const cards = Array.from(this.growthGrid.querySelectorAll<HTMLElement>('.growth-card'))
    GROWTH_TOWER_TYPES.forEach((def, i) => {
      const card = cards[i]
      const level = this.campaign.towerGrowthBonus(def.id)
      const bars = Array.from(card.querySelectorAll('.growth-level i'))
      bars.forEach((bar, barIndex) => bar.classList.toggle('active', barIndex < level))
      const augmentEl = card.querySelector('[data-role="augment"]') as HTMLElement
      augmentEl.textContent = `AUGMENT // ${String(level).padStart(2, '0')}`
      const damageEl = card.querySelector('[data-role="damage"]') as HTMLElement
      damageEl.textContent = `+${level * 6}%`
      const rangeEl = card.querySelector('[data-role="range"]') as HTMLElement
      rangeEl.textContent = `+${level * 3}%`
      const upgradeBtn = card.querySelector('.growth-upgrade') as HTMLButtonElement
      if (level >= MAX_GROWTH_LEVEL) {
        upgradeBtn.textContent = '已满级'
        upgradeBtn.disabled = true
      } else {
        const cost = growthUpgradeCost(level)
        upgradeBtn.textContent = `升级 · ${cost} 研发点`
        upgradeBtn.disabled = this.campaign.researchPoints < cost
      }
    })
  }
}




