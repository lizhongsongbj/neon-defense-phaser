import type Phaser from 'phaser'
import { MAP_LEVELS, CAMPAIGN_THREAT_LEVELS, CAMPAIGN_WAVE_COUNTS, CAMPAIGN_ENEMY_COUNTS, CAMPAIGN_STARTING_COINS } from '../data/maps'
import { TOWER_TYPES } from '../data/towers'
import { EXPANSION_TOWERS, GROWTH_TOWER_IDS, type AllTowerId } from '../data/towerExpansion'
import type { Difficulty } from '../data/balance'
import { growthUpgradeCost } from '../systems/Economy'
import { CampaignState } from '../state/CampaignState'
import { MUSIC_REGISTRY_KEY, VOICE_REGISTRY_KEY, type MusicController, type VoiceSystem } from '../audio'
import { BalancePanel } from './BalancePanel'
import { AnimationPanel } from './AnimationPanel'
import { EffectPanel } from './EffectPanel'
import { AudioStudio } from './AudioStudio'
import { UIArtStudio } from './UIArtStudio'
import { MAX_PLAYER_SKILL_LEVEL, PLAYER_SKILLS, playerSkillCooldown, playerSkillUpgradeCost, type PlayerSkillId } from '../data/playerSkills'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', normal: '标准', hard: '困难' }
const STATUS_LABEL: Record<'cleared' | 'online' | 'locked', string> = { cleared: 'CLEARED', online: 'ONLINE', locked: 'LOCKED' }
const MAX_GROWTH_LEVEL = 3
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
  private readonly researchPointsEl: HTMLElement
  private readonly growthTotalEl: HTMLElement
  private readonly growthGrid: HTMLElement
  private readonly skillGrowthGrid: HTMLElement
  private readonly closeButton: HTMLButtonElement
  private readonly voiceToggle: HTMLButtonElement
  private readonly musicToggle: HTMLButtonElement
  private readonly tabs: HTMLButtonElement[]
  private readonly panels: Record<string, HTMLElement>
  private readonly assetTabs: HTMLButtonElement[]
  private readonly assetPanels: Record<string, HTMLElement>
  private readonly balancePanel: BalancePanel
  private readonly animationPanel: AnimationPanel
  private readonly effectPanel: EffectPanel
  private readonly audioStudio: AudioStudio
  private readonly uiArtStudio: UIArtStudio
  private previousAssetTab = 'animations'

  private selectedMapIndex = 0
  private selectedDifficulty: Difficulty = 'normal'
  private assetsReady = false
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
      balance: this.el.querySelector('[data-command-panel="balance"]') as HTMLElement,
      assets: this.el.querySelector('[data-command-panel="assets"]') as HTMLElement,
    }
    this.assetTabs = Array.from(this.el.querySelectorAll('[data-asset-tab]'))
    this.assetPanels = {
      animations: this.el.querySelector('[data-asset-panel="animations"]') as HTMLElement,
      effects: this.el.querySelector('[data-asset-panel="effects"]') as HTMLElement,
      studio: this.el.querySelector('[data-asset-panel="studio"]') as HTMLElement,
      'ui-art': this.el.querySelector('[data-asset-panel="ui-art"]') as HTMLElement,
      audio: this.el.querySelector('[data-asset-panel="audio"]') as HTMLElement,
    }

    // 新进入游戏时始终从第一个地图开始显示，存档进度不会改变默认选中项。
    this.selectedMapIndex = 0
    this.selectedDifficulty = campaign.difficulty
    this.balancePanel = new BalancePanel(campaign, () => this.selectedMapIndex)
    this.animationPanel = new AnimationPanel()
    this.effectPanel = new EffectPanel()
    this.audioStudio = new AudioStudio()
    this.uiArtStudio = new UIArtStudio()
    this.buildLoadoutDialog()

    this.buildMissionList()
    this.buildDifficultyButtons()
    this.buildGrowthGrid()
    this.buildSkillGrowthGrid()
    this.bindTabs()
    this.bindAssetTabs()
    this.bindImageStudioReturn()
    this.bindDeploy()
    this.bindClose()
    this.bindAudioToggles()
  }

  show() {
    this.el.hidden = false
    this.music()?.startMenu()
    this.syncAudioLabels()
    this.refresh()
  }

  hide() {
    this.el.hidden = true
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
        if (target === 'balance') this.balancePanel.onTabActivated()
        if (target === 'assets') this.activateAssetPanel(this.activeAssetTab())
      })
    })
  }

  private bindImageStudioReturn() {
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'neon-defense:return-from-image-studio') return
      this.activateAssetPanel(this.previousAssetTab)
    })
  }

  private bindAssetTabs() {
    this.assetTabs.forEach((tab) => {
      tab.addEventListener('click', () => this.activateAssetPanel(tab.dataset.assetTab as string))
    })
  }

  private activeAssetTab() {
    return this.assetTabs.find((tab) => tab.getAttribute('aria-selected') === 'true')?.dataset.assetTab ?? 'animations'
  }

  private activateAssetPanel(target: string) {
    const current = this.activeAssetTab()
    if (target === 'studio' && current !== 'studio') this.previousAssetTab = current
    if (target !== 'studio') this.previousAssetTab = target
    this.assetTabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.assetTab === target)))
    Object.entries(this.assetPanels).forEach(([key, panel]) => {
      panel.hidden = key !== target
    })
    if (target === 'animations') this.animationPanel.activate()
    if (target === 'effects') this.effectPanel.activate()
    if (target === 'audio') this.audioStudio.activate()
    if (target === 'ui-art') this.uiArtStudio.activate()
    if (target === 'studio') {
      const frame = this.assetPanels.studio.querySelector<HTMLIFrameElement>('.image-studio-frame')
      if (frame && !frame.src) frame.src = frame.dataset.src ?? '/image-studio.html'
    }
  }

  private bindClose() {
    this.closeButton.addEventListener('click', () => this.onExitToTitle())
  }

  private buildMissionList() {
    MAP_LEVELS.forEach((map, index) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.className = 'mission-row'
      const code = String(index + 1).padStart(2, '0')
      row.innerHTML = `
        ${map.available ? `<img src="${map.image}" alt="${map.name}" />` : '<span class="mission-row__empty" aria-hidden="true">EMPTY</span>'}
        <span class="mission-row__copy">
          <b>${code} · ${map.name}</b>
          <small>${map.available ? `${CAMPAIGN_WAVE_COUNTS[index]} 波 · ${CAMPAIGN_ENEMY_COUNTS[index]} 种敌军 · THREAT ${CAMPAIGN_THREAT_LEVELS[index].toFixed(2)}` : '等待新版地图数据'}</small>
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
      if (!this.campaign.isMapUnlocked(this.selectedMapIndex) || !this.assetsReady) return
      this.openLoadoutDialog()
    })
  }

  refresh() {
    const rows = Array.from(this.missionList.querySelectorAll<HTMLButtonElement>('.mission-row'))
    rows.forEach((row, index) => {
      const status = this.campaign.mapStatus(index)
      row.dataset.status = status
      row.setAttribute('aria-selected', String(index === this.selectedMapIndex))
      const statusEl = row.querySelector('[data-role="status"]') as HTMLElement
      statusEl.textContent = MAP_LEVELS[index].available ? STATUS_LABEL[status] : 'RENOVATION'
    })

    Array.from(this.difficultyEl.querySelectorAll<HTMLButtonElement>('button')).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.diff === this.selectedDifficulty)
    })

    const map = MAP_LEVELS[this.selectedMapIndex]
    const unlocked = this.campaign.isMapUnlocked(this.selectedMapIndex)
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
        <span class=`"map-access-note`"></span>
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


