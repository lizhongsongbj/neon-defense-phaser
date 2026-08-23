import type Phaser from 'phaser'
import { MAP_LEVELS, CAMPAIGN_THREAT_LEVELS, CAMPAIGN_WAVE_COUNTS, CAMPAIGN_ENEMY_COUNTS, CAMPAIGN_STARTING_COINS } from '../data/maps'
import { TOWER_TYPES, TOWER_IDS, type TowerId } from '../data/towers'
import { ENEMY_TYPES, type EnemyDefinition } from '../data/enemies'
import { BOSS_TYPES, type BossDefinition } from '../data/bosses'
import type { Difficulty } from '../data/balance'
import { growthUpgradeCost } from '../systems/Economy'
import { CampaignState } from '../state/CampaignState'
import { MUSIC_REGISTRY_KEY, type MusicController } from '../audio'
import { BalancePanel } from './BalancePanel'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', normal: '标准', hard: '困难' }
const STATUS_LABEL: Record<'cleared' | 'online' | 'locked', string> = { cleared: 'CLEARED', online: 'ONLINE', locked: 'LOCKED' }
const MAX_GROWTH_LEVEL = 3

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
  private readonly monsterGrid: HTMLElement
  private readonly closeButton: HTMLButtonElement
  private readonly tabs: HTMLButtonElement[]
  private readonly panels: Record<string, HTMLElement>
  private readonly balancePanel: BalancePanel

  private selectedMapIndex = 0
  private selectedDifficulty: Difficulty = 'normal'
  private assetsReady = false

  constructor(
    private readonly campaign: CampaignState,
    private readonly game: Phaser.Game,
    private readonly onDeploy: (mapIndex: number, difficulty: Difficulty) => void,
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
    this.monsterGrid = document.getElementById('monster-grid') as HTMLElement
    this.closeButton = document.getElementById('command-close') as HTMLButtonElement
    this.tabs = Array.from(this.el.querySelectorAll('.command-tab'))
    this.panels = {
      missions: this.el.querySelector('[data-command-panel="missions"]') as HTMLElement,
      growth: this.el.querySelector('[data-command-panel="growth"]') as HTMLElement,
      monsters: this.el.querySelector('[data-command-panel="monsters"]') as HTMLElement,
      balance: this.el.querySelector('[data-command-panel="balance"]') as HTMLElement,
    }

    this.selectedMapIndex = campaign.isMapUnlocked(campaign.mapIndex) ? campaign.mapIndex : campaign.unlockedMapIndex
    this.selectedDifficulty = campaign.difficulty
    this.balancePanel = new BalancePanel(campaign, () => this.selectedMapIndex)

    this.buildMissionList()
    this.buildDifficultyButtons()
    this.buildGrowthGrid()
    this.buildMonsterGrid()
    this.bindTabs()
    this.bindDeploy()
    this.bindClose()
  }

  show() {
    this.el.hidden = false
    void this.music()?.start(this.selectedMapIndex)
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

  private bindTabs() {
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.commandTab as string
        this.tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)))
        Object.entries(this.panels).forEach(([key, panel]) => {
          panel.hidden = key !== target
        })
        if (target === 'balance') this.balancePanel.onTabActivated()
      })
    })
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
        <img src="${map.image}" alt="${map.name}" />
        <span class="mission-row__copy">
          <b>${code} · ${map.name}</b>
          <small>${CAMPAIGN_WAVE_COUNTS[index]} 波 · ${CAMPAIGN_ENEMY_COUNTS[index]} 种敌军 · THREAT ${CAMPAIGN_THREAT_LEVELS[index].toFixed(2)}</small>
        </span>
        <em data-role="status"></em>
      `
      row.addEventListener('click', () => {
        if (!this.campaign.isMapUnlocked(index)) return
        this.selectedMapIndex = index
        void this.music()?.playMap(index)
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
    TOWER_TYPES.forEach((def) => {
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

  private buildMonsterGrid() {
    type HostileDefinition = EnemyDefinition | BossDefinition

    const hostiles: HostileDefinition[] = [...Object.values(ENEMY_TYPES), ...Object.values(BOSS_TYPES)]
    hostiles.forEach((def, index) => {
      const isBoss = 'boss' in def && def.boss
      const tags = [
        isBoss ? 'BOSS' : '常规单位',
        'air' in def && def.air ? '空中' : null,
        def.mechanical ? '机械' : '生物',
        'phase' in def && def.phase ? '相位' : null,
        'network' in def && def.network ? '网络' : null,
      ].filter(Boolean) as string[]

      const shieldStat = 'shield' in def && def.shield
        ? `<div><span>护盾</span><b>${def.shield}</b></div>`
        : ''
      const componentInfo = 'components' in def && def.components
        ? `<div class="monster-card__components"><span>可破坏部件</span><b>${def.components.join(' / ')}</b><em>单件 ${def.componentHp} HP</em></div>`
        : ''

      const card = document.createElement('article')
      card.className = `monster-card${isBoss ? ' is-boss' : ''}`
      card.style.setProperty('--monster-index', String(index))
      card.innerHTML = `
        <div class="monster-card__visual">
          <div class="monster-card__index">TARGET // ${String(index + 1).padStart(2, '0')}</div>
          <img src="${def.image}" alt="${def.name}" loading="lazy" />
          <div class="monster-card__tags">${tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
        </div>
        <div class="monster-card__body">
          <header>
            <div><small>${isBoss ? '首领单位' : '敌对单位'}</small><h3>${def.name}</h3></div>
            <strong>赏金 ${def.reward} G</strong>
          </header>
          <div class="monster-card__stats">
            <div><span>生命</span><b>${def.hp}</b></div>
            ${shieldStat}
            <div><span>攻击</span><b>${def.attack}</b></div>
            <div><span>速度</span><b>${def.speed}</b></div>
            <div><span>护甲</span><b>${Math.round(def.armor * 100)}%</b></div>
          </div>
          ${componentInfo}
          <p>${def.trait}</p>
        </div>
      `
      this.monsterGrid.appendChild(card)
    })
  }

  private tryUpgradeGrowth(id: TowerId) {
    const level = this.campaign.towerGrowthBonus(id)
    if (level >= MAX_GROWTH_LEVEL) return
    const cost = growthUpgradeCost(level)
    if (this.campaign.researchPoints < cost) return
    this.campaign.researchPoints -= cost
    this.campaign.towerGrowth[id] = level + 1
    this.campaign.persist()
    this.refresh()
  }

  private bindDeploy() {
    this.deployButton.addEventListener('click', () => {
      if (!this.campaign.isMapUnlocked(this.selectedMapIndex) || !this.assetsReady) return
      this.onDeploy(this.selectedMapIndex, this.selectedDifficulty)
    })
  }

  refresh() {
    const rows = Array.from(this.missionList.querySelectorAll<HTMLButtonElement>('.mission-row'))
    rows.forEach((row, index) => {
      const status = this.campaign.mapStatus(index)
      row.dataset.status = status
      row.setAttribute('aria-selected', String(index === this.selectedMapIndex))
      const statusEl = row.querySelector('[data-role="status"]') as HTMLElement
      statusEl.textContent = STATUS_LABEL[status]
    })

    Array.from(this.difficultyEl.querySelectorAll<HTMLButtonElement>('button')).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.diff === this.selectedDifficulty)
    })

    const map = MAP_LEVELS[this.selectedMapIndex]
    const code = String(this.selectedMapIndex + 1).padStart(2, '0')
    this.visualImg.src = map.image
    this.visualImg.alt = map.name
    this.codeEl.textContent = `SECTOR ${code} // ONLINE`
    this.titleEl.textContent = map.name
    this.metaEl.innerHTML = `
      <span>威胁系数 <b>${CAMPAIGN_THREAT_LEVELS[this.selectedMapIndex].toFixed(2)}</b></span>
      <span>关卡波次 <b>${CAMPAIGN_WAVE_COUNTS[this.selectedMapIndex]}</b></span>
      <span>敌军种类 <b>${CAMPAIGN_ENEMY_COUNTS[this.selectedMapIndex]}</b></span>
      <span>防御节点 <b>${map.slots.length}</b></span>
      <span>初始金币 <b>${CAMPAIGN_STARTING_COINS[this.selectedMapIndex]}</b></span>
      <span class="menu-save-status">存档已同步</span>
    `
    const unlocked = this.campaign.isMapUnlocked(this.selectedMapIndex)
    this.deployButton.disabled = !unlocked || !this.assetsReady
    this.deployButton.textContent = !this.assetsReady ? '资源加载中…' : !unlocked ? '未解锁' : 'DEPLOY // 进入战区'

    this.researchPointsEl.textContent = String(this.campaign.researchPoints)
    const growthTotal = TOWER_IDS.reduce((sum, id) => sum + this.campaign.towerGrowthBonus(id), 0)
    this.growthTotalEl.textContent = String(growthTotal).padStart(2, '0')

    const cards = Array.from(this.growthGrid.querySelectorAll<HTMLElement>('.growth-card'))
    TOWER_TYPES.forEach((def, i) => {
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
