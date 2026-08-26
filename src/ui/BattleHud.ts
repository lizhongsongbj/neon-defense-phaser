import type Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig'
import { ALL_TOWER_TYPES, type AllTowerId } from '../data/towerExpansion'
import { ENEMY_TYPES, type EnemyDefinition } from '../data/enemies'
import { BOSS_TYPES, bossComponentHp, type BossDefinition } from '../data/bosses'
import { SPECIAL_EVENTS } from '../data/specialEvents'
import { EventBus, GameEvents, type BattleHudPayload, type SlotSelectedPayload, type SpecialEventPayload, type TacticalAlertPayload, type WaveClearedPayload } from '../state/EventBus'
import { REGISTRY_KEY, type CampaignState } from '../state/CampaignState'
import type { PlayerSkillId } from '../data/playerSkills'

interface TowerInfoPayload {
  towerId: string
  typeId: AllTowerId
  name: string
  role: string
  level: number
  maxLevel: number
  upgradeCost: number | null
  sellValue: number
  damageDealt: number
  attacks: number
  coins: number
  tier4BranchId: string | null
  tier4Branches: Array<{ id: string; branch: 'A' | 'B'; name: string; role: string; cost: number; notes: readonly string[] }>
}

const HINT_IDLE = 'BUILD GRID // 塔位待命'
const HINT_SLOT_SELECTED = 'TOWER SELECT // 选择塔型'
const HINT_TOWER_SELECTED = 'TOWER LOCKED // 已选中塔楼'

/**
 * 战斗 HUD(HTML+CSS),叠加在 #stage 内的 Phaser 画布上方,
 * 取代旧的 Phaser 版 UiScene。结构对照原版战场的 .topbar / .wave-console /
 * .player-status / .hint,与 BattleScene 之间仍通过既有的 EventBus 通信。
 */
export class BattleHud {
  private readonly counterEl: HTMLElement
  private readonly waveValueEl: HTMLElement
  private readonly enemyCountEl: HTMLElement
  private readonly coinsEl: HTMLElement
  private readonly healthEl: HTMLElement
  private readonly healthFillEl: HTMLElement
  private readonly speedButtons: HTMLButtonElement[]
  private readonly startWaveButton: HTMLButtonElement
  private readonly toast: HTMLElement
  private readonly specialEventBanner: HTMLElement
  private readonly specialEventKicker: HTMLElement
  private readonly specialEventSource: HTMLElement
  private readonly specialEventTitle: HTMLElement
  private readonly specialEventDescription: HTMLElement
  private readonly specialEventEffect: HTMLElement
  private readonly hintEl: HTMLElement
  private readonly towerPicker: HTMLElement
  private readonly towerOptions: HTMLElement
  private readonly pickerClose: HTMLButtonElement
  private readonly actionPanel: HTMLElement
  private readonly actionName: HTMLElement
  private readonly actionStats: HTMLElement
  private readonly tier4BranchesEl: HTMLElement
  private readonly upgradeBtn: HTMLButtonElement
  private readonly sellBtn: HTMLButtonElement
  private readonly endOverlay: HTMLElement
  private readonly endTitle: HTMLElement
  private readonly endSubtitle: HTMLElement
  private readonly resetButton: HTMLButtonElement
  private readonly intelPanel: HTMLElement
  private readonly intelContent: HTMLElement
  private readonly helpPanel: HTMLElement
  private readonly skillButtons: HTMLButtonElement[]

  private currentSpeed: 1 | 2 | 3 = 1
  private currentTowerInfo: TowerInfoPayload | null = null
  private pendingSlot: SlotSelectedPayload | null = null
  private toastTimer: number | undefined
  private specialEventTimer: number | undefined
  private tacticalAlertTimer: number | undefined
  private targetingSkill: PlayerSkillId | null = null

  constructor(private readonly game: Phaser.Game) {
    this.counterEl = document.getElementById('counter') as HTMLElement
    this.waveValueEl = document.getElementById('wave-value') as HTMLElement
    this.enemyCountEl = document.getElementById('enemy-count') as HTMLElement
    this.coinsEl = document.getElementById('coin-value') as HTMLElement
    this.healthEl = document.getElementById('health-value') as HTMLElement
    this.healthFillEl = document.getElementById('health-fill') as HTMLElement
    this.speedButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-speed]'))
    this.startWaveButton = document.getElementById('start-wave') as HTMLButtonElement
    this.toast = document.getElementById('wave-toast') as HTMLElement
    this.specialEventBanner = document.getElementById('special-event-banner') as HTMLElement
    this.specialEventKicker = document.getElementById('special-event-kicker') as HTMLElement
    this.specialEventSource = document.getElementById('special-event-source') as HTMLElement
    this.specialEventTitle = document.getElementById('special-event-title') as HTMLElement
    this.specialEventDescription = document.getElementById('special-event-description') as HTMLElement
    this.specialEventEffect = document.getElementById('special-event-effect') as HTMLElement
    this.hintEl = document.getElementById('hint') as HTMLElement
    this.towerPicker = document.getElementById('tower-picker') as HTMLElement
    this.towerOptions = document.getElementById('tower-options') as HTMLElement
    this.pickerClose = document.getElementById('picker-close') as HTMLButtonElement
    this.actionPanel = document.getElementById('tower-actions') as HTMLElement
    this.actionName = document.getElementById('tower-actions-name') as HTMLElement
    this.actionStats = document.getElementById('tower-actions-stats') as HTMLElement
    this.tier4BranchesEl = document.getElementById('tower-tier4-branches') as HTMLElement
    this.upgradeBtn = document.getElementById('tower-upgrade') as HTMLButtonElement
    this.sellBtn = document.getElementById('tower-sell') as HTMLButtonElement
    this.endOverlay = document.getElementById('end-overlay') as HTMLElement
    this.endTitle = document.getElementById('end-title') as HTMLElement
    this.endSubtitle = document.getElementById('end-subtitle') as HTMLElement
    this.resetButton = document.getElementById('reset-deployment') as HTMLButtonElement
    this.intelPanel = document.getElementById('intel-panel') as HTMLElement
    this.intelContent = document.getElementById('intel-content') as HTMLElement
    this.helpPanel = document.getElementById('help-panel') as HTMLElement
    this.skillButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-player-skill]'))

    this.buildTowerPicker()
    this.buildIntelContent()
    this.bindSpeedButtons()
    this.bindStartWave()
    this.bindActionButtons()
    this.bindReturnButtons()
    this.bindResetButton()
    this.bindPickerClose()
    this.bindOverlayToggles()
    this.bindPlayerSkills()

    EventBus.on(GameEvents.HudUpdate, this.onHudUpdate, this)
    EventBus.on(GameEvents.SlotClicked, this.onSlotClicked, this)
    EventBus.on(GameEvents.TowerInfoUpdate, this.onTowerInfo, this)
    EventBus.on(GameEvents.TowerActionFeedback, this.onTowerActionFeedback, this)
    EventBus.on(GameEvents.ClearSelection, this.onClearSelection, this)
    EventBus.on(GameEvents.WaveCleared, this.onWaveCleared, this)
    EventBus.on(GameEvents.EarlyWaveBonus, this.onEarlyWaveBonus, this)
    EventBus.on(GameEvents.SpecialEventStarted, this.onSpecialEventStarted, this)
    EventBus.on(GameEvents.SpecialEventEnded, this.onSpecialEventEnded, this)
    EventBus.on(GameEvents.TacticalAlert, this.onTacticalAlert, this)
    EventBus.on(GameEvents.Victory, this.onVictory, this)
    EventBus.on(GameEvents.GameOver, this.onGameOver, this)
    EventBus.on(GameEvents.PlayerSkillTargeting, this.onPlayerSkillTargeting, this)
    EventBus.on(GameEvents.PlayerSkillFeedback, this.onPlayerSkillFeedback, this)
  }

  /** 每次进入新的一局战斗前重置界面状态,对应旧 UiScene.create() 的初始化。 */
  reset() {
    this.currentTowerInfo = null
    this.pendingSlot = null
    this.hideTowerPicker()
    // ????????????????????????
    this.buildTowerPicker()
    this.actionPanel.hidden = true
    this.endOverlay.hidden = true
    this.intelPanel.hidden = true
    this.helpPanel.hidden = true
    this.toast.classList.remove('visible')
    this.specialEventBanner.hidden = true
    this.targetingSkill = null
    this.skillButtons.forEach((button) => button.classList.remove('is-targeting'))
    window.clearTimeout(this.specialEventTimer)
    window.clearTimeout(this.tacticalAlertTimer)
    this.setHint(HINT_IDLE)
    const campaign = this.game.registry.get(REGISTRY_KEY) as CampaignState | undefined
    this.currentSpeed = campaign?.gameSpeed ?? 1
    this.refreshSpeedButtons()
  }

  private setHint(text: string) {
    this.hintEl.textContent = text
  }

  private bindPlayerSkills() {
    this.skillButtons.forEach((button, index) => {
      const skillId = button.dataset.playerSkill as PlayerSkillId
      button.addEventListener('click', () => EventBus.emit(GameEvents.ActivatePlayerSkill, { skillId }))
      window.addEventListener('keydown', (event) => {
        if (event.repeat || event.key !== String(index + 1)) return
        const gameRoot = document.getElementById('game-root') as HTMLElement | null
        if (gameRoot?.hidden) return
        EventBus.emit(GameEvents.ActivatePlayerSkill, { skillId })
      })
    })
  }

  private onPlayerSkillTargeting(payload: { skillId: PlayerSkillId | null }) {
    this.targetingSkill = payload.skillId
    this.skillButtons.forEach((button) => button.classList.toggle('is-targeting', button.dataset.playerSkill === payload.skillId))
    this.setHint(payload.skillId ? 'TARGETING // 点击战场释放，重复点击技能可取消' : HINT_IDLE)
  }

  private onPlayerSkillFeedback(payload: { message: string }) {
    this.showToast(payload.message)
  }

  private bindSpeedButtons() {
    this.speedButtons.forEach((btn) => {
      const speed = Number(btn.dataset.speed) as 1 | 2 | 3
      btn.addEventListener('click', () => {
        this.currentSpeed = speed
        EventBus.emit(GameEvents.SetSpeed, { speed })
        this.refreshSpeedButtons()
      })
    })
  }

  private refreshSpeedButtons() {
    this.speedButtons.forEach((btn) => {
      const speed = Number(btn.dataset.speed)
      btn.setAttribute('aria-pressed', String(speed === this.currentSpeed))
    })
  }

  private bindStartWave() {
    this.startWaveButton.addEventListener('click', () => {
      EventBus.emit(GameEvents.StartNextWave)
    })
  }

  private bindReturnButtons() {
    document.getElementById('return-command-center')?.addEventListener('click', () => {
      EventBus.emit(GameEvents.ReturnToCommandCenter)
    })
    document.getElementById('end-return')?.addEventListener('click', () => {
      EventBus.emit(GameEvents.ReturnToCommandCenter)
    })
  }

  private bindResetButton() {
    this.resetButton.addEventListener('click', () => {
      this.hideTowerPicker()
      this.actionPanel.hidden = true
      this.setHint(HINT_IDLE)
      EventBus.emit(GameEvents.ResetDeployment)
    })
  }

  private bindPickerClose() {
    this.pickerClose.addEventListener('click', () => {
      this.hideTowerPicker()
      EventBus.emit(GameEvents.ClearSelection)
    })
  }

  private bindOverlayToggles() {
    const intelButton = document.getElementById('intel-button')
    const intelClose = document.getElementById('intel-close')
    intelButton?.addEventListener('click', () => {
      this.helpPanel.hidden = true
      this.intelPanel.hidden = false
    })
    intelClose?.addEventListener('click', () => {
      this.intelPanel.hidden = true
    })

    const helpButton = document.getElementById('help-button')
    const helpClose = document.getElementById('help-close')
    helpButton?.addEventListener('click', () => {
      this.intelPanel.hidden = true
      this.helpPanel.hidden = false
    })
    helpClose?.addEventListener('click', () => {
      this.helpPanel.hidden = true
    })
  }

  private buildTowerPicker() {
    this.towerOptions.replaceChildren()
    const campaign = this.game.registry.get(REGISTRY_KEY) as CampaignState | undefined
    const selected = new Set(campaign?.selectedTowerIds ?? ALL_TOWER_TYPES.map((tower) => tower.id))
    const towerDeck = ALL_TOWER_TYPES.filter((def) => selected.has(def.id))
    this.towerPicker.dataset.towerCount = String(towerDeck.length)
    const pickerBar = this.towerPicker.querySelector<HTMLElement>('.tower-picker__bar')
    if (pickerBar) pickerBar.dataset.count = String(towerDeck.length).padStart(2, '0')

    towerDeck.forEach((def, index) => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'tower-option'
      card.dataset.cost = String(def.cost)
      card.style.setProperty('--tower-accent', def.accent)
      card.setAttribute('aria-label', `建造${def.name}，消耗 ${def.cost} 金币`)
      card.innerHTML = `
        <span class="tower-option__index">${String(index + 1).padStart(2, '0')}</span>
        <span class="tower-option__visual"><img src="${def.image}" alt="" /></span>
        <span class="tower-option__copy"><strong>${def.name}</strong><small>${def.role}</small></span>
        <em class="tower-option__cost"><span>BUILD</span><b>${def.cost}</b><i>G</i></em>
      `
      card.addEventListener('click', (event) => {
        event.stopPropagation()
        this.confirmBuild(def.id)
      })
      this.towerOptions.appendChild(card)
    })
  }

  private refreshTowerAffordability(coins: number) {
    this.towerOptions.querySelectorAll<HTMLButtonElement>('.tower-option').forEach((card) => {
      const cost = Number(card.dataset.cost ?? 0)
      card.disabled = coins < cost
      card.classList.toggle('is-affordable', coins >= cost)
    })
  }

  private buildIntelContent() {
    type HostileDefinition = EnemyDefinition | BossDefinition

    const hostileRows = [...Object.values(ENEMY_TYPES), ...Object.values(BOSS_TYPES)].map((def: HostileDefinition) => {
      const isBoss = 'boss' in def && def.boss
      const badges = [
        isBoss ? 'BOSS' : ('heavy' in def && def.heavy ? '重型' : '常规'),
        'air' in def && def.air ? '空中' : null,
        def.mechanical ? '机械' : '生物',
        'phase' in def && def.phase ? '相位' : null,
        'network' in def && def.network ? '网络' : null,
        'energyResistance' in def && def.energyResistance ? '抗能量' : null,
        'droneEvasion' in def && def.droneEvasion ? '链路欺骗' : null,
        'enrageThreshold' in def && def.enrageThreshold ? '痛觉超频' : null,
        'healingAura' in def && def.healingAura ? '生物修复' : null,
        'energyResistance' in def && typeof def.energyResistance === 'number' && def.energyResistance < 0 ? '能量弱点' : null,
        !def.mechanical && def.armor >= 0.5 ? '骨铠' : null,
      ]
        .filter(Boolean)
        .map((badge) => `<span>${badge}</span>`)
        .join('')
      const matchup = 'countersTower' in def && def.countersTower && def.counteredByTower
        ? `<p class="intel-enemy__matchup"><span>克制 ${def.countersTower}</span><b>弱点 ${def.counteredByTower}</b></p>` : ''
      const shield = 'shield' in def && def.shield ? `<li><span>护盾</span><b>${def.shield}</b></li>` : ''
      const components = 'components' in def && def.components
        ? `<p class="intel-enemy__components">部件：${def.components.map((component) => `${component} ${bossComponentHp(def, component)} HP`).join(' / ')} </p>`
        : ''
      const stages = isBoss && 'stages' in def
        ? `<div class="intel-boss-stages">${def.stages.map((stage) => `<article><strong>阶段 ${stage.stage} · ${stage.name}</strong><span>${stage.enterCondition}</span><small>生命阈值 ${Math.round(stage.hpThreshold * 100)}% · 护甲 ${Math.round(stage.armor * 100)}% · 速度 ${stage.speed} · 攻击 ${stage.attack}</small><b>${stage.abilityName}</b><em>${stage.abilityDescription}</em></article>`).join('')} </div>`
        : ''

      return `
        <article class="intel-enemy-card${isBoss ? ' is-boss' : ''}">
          <div class="intel-enemy__portrait">
            <img src="${def.image}" alt="${def.name}" />
            <div class="intel-enemy__badges">${badges}</div>
          </div>
          <div class="intel-enemy__body">
            <div class="intel-enemy__heading">
              <div><small>${isBoss ? '首领单位' : '敌对单位'}</small><b>${def.name}</b></div>
              <em>赏金 ${def.reward} G</em>
            </div>
            <ul class="intel-enemy__stats">
              <li><span>生命</span><b>${def.hp}</b></li>
              ${shield}
              <li><span>攻击</span><b>${def.attack}</b></li>
              <li><span>速度</span><b>${def.speed}</b></li>
              <li><span>护甲</span><b>${Math.round(def.armor * 100)}%</b></li>
            </ul>
            ${components}
            ${stages}
            ${matchup}
            <p class="intel-enemy__trait">${def.trait}</p>
          </div>
        </article>
      `
    }).join('')

    const towerRows = ALL_TOWER_TYPES.map(
      (def) => `
        <div class="intel-tower-row">
          <img src="${def.image}" alt="${def.name}" />
          <div>
            <b style="color:${def.accent}">${def.name} · ${def.cost} 币</b>
            <span>${def.role}</span>
          </div>
        </div>
      `,
    ).join('')

    const eventRows = SPECIAL_EVENTS.map((event) => `
      <article class="intel-event-card${event.tone === 'bad' ? ' is-bad' : ''}">
        <small>${event.tone === 'good' ? '有利事件' : '干扰事件'} · ${event.source}</small>
        <strong>${event.title}</strong>
        <span>${event.description}</span>
        <b>${event.effectLabel}${event.durationSeconds ? ` · ${event.durationSeconds} 秒` : ''}</b>
      </article>
    `).join('')

    this.intelContent.innerHTML = `
      <section class="intel-section">
        <div class="intel-section__heading"><span>HOSTILE DATABASE</span><strong>怪物图鉴</strong><em>${Object.keys(ENEMY_TYPES).length + Object.keys(BOSS_TYPES).length} 个单位</em></div>
        <div class="intel-enemy-list">${hostileRows}</div>
      </section>
      <section class="intel-section">
        <div class="intel-section__heading"><span>DEFENSE DATABASE</span><strong>塔楼档案</strong><em>${ALL_TOWER_TYPES.length} 座塔楼</em></div>
        <div class="intel-tower-list">${towerRows}</div>
      </section>
      <section class="intel-section">
        <div class="intel-section__heading"><span>STREET ANOMALY FEED</span><strong>街区特殊事件</strong><em>${SPECIAL_EVENTS.length} 种信号</em></div>
        <div class="intel-event-list">${eventRows}</div>
      </section>
    `
  }
  private confirmBuild(typeId: AllTowerId) {
    if (!this.pendingSlot) return
    const cost = ALL_TOWER_TYPES.find((t) => t.id === typeId)!.cost
    if (this.pendingSlot.coins < cost) return
    EventBus.emit(GameEvents.BuildTower, { slotIndex: this.pendingSlot.slotIndex, typeId })
    this.hideTowerPicker()
  }

  private hideTowerPicker() {
    this.towerPicker.hidden = true
    this.pendingSlot = null
  }

  private onSlotClicked(payload: SlotSelectedPayload) {
    this.pendingSlot = payload
    this.refreshTowerAffordability(payload.coins)
    this.towerPicker.hidden = false
    this.actionPanel.hidden = true
    this.setHint(HINT_SLOT_SELECTED)
  }

  private bindActionButtons() {
    this.upgradeBtn.addEventListener('click', () => {
      if (!this.currentTowerInfo) return
      EventBus.emit(GameEvents.UpgradeTower, { towerId: this.currentTowerInfo.towerId })
    })
    this.sellBtn.addEventListener('click', () => {
      if (!this.currentTowerInfo) return
      EventBus.emit(GameEvents.SellTower, { towerId: this.currentTowerInfo.towerId })
    })
  }

  private onTowerInfo(payload: TowerInfoPayload) {
    this.currentTowerInfo = payload
    this.hideTowerPicker()
    this.actionPanel.hidden = false
    const x = GAME_WIDTH - 240
    const y = GAME_HEIGHT - 220
    this.actionPanel.style.left = `${x}px`
    this.actionPanel.style.top = `${y}px`
    this.actionName.innerHTML = `${payload.name} · LV.${payload.level} <b>${payload.role}</b>`
    this.actionStats.textContent = `累计伤害 ${payload.damageDealt} · 攻击 ${payload.attacks} 次`
    this.renderTier4Branches(payload)
    this.refreshUpgradeButton(payload.coins)
    this.sellBtn.innerHTML = `<strong>拆除</strong><small>返还 ${payload.sellValue} 币</small>`
    this.setHint(HINT_TOWER_SELECTED)
  }

  private renderTier4Branches(payload: TowerInfoPayload) {
    this.tier4BranchesEl.replaceChildren()
    const choices = payload.level === 3 ? payload.tier4Branches : []
    this.tier4BranchesEl.hidden = choices.length === 0
    this.upgradeBtn.hidden = choices.length > 0
    for (const choice of choices) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'tower-tier4-branch'
      const deficit = Math.max(0, Math.ceil(choice.cost - payload.coins))
      button.dataset.affordable = String(deficit === 0)
      button.innerHTML = `<span>路线 ${choice.branch}</span><strong>${choice.name}</strong><small>${choice.role}</small><em>${choice.cost} 币${deficit ? ` · 还差 ${deficit}` : ''}</em>`
      button.title = choice.notes.join('；')
      button.addEventListener('click', () => EventBus.emit(GameEvents.UpgradeTower, { towerId: payload.towerId, branchId: choice.id }))
      this.tier4BranchesEl.append(button)
    }
  }

  private refreshUpgradeButton(coins: number) {
    const cost = this.currentTowerInfo?.upgradeCost
    if (this.currentTowerInfo?.level === 3 && this.currentTowerInfo.tier4Branches.length) {
      this.renderTier4Branches({ ...this.currentTowerInfo, coins })
      return
    }
    this.upgradeBtn.hidden = false
    if (cost == null) {
      this.upgradeBtn.innerHTML = '<strong>已满级</strong>'
      this.upgradeBtn.disabled = true
      this.upgradeBtn.removeAttribute('title')
      delete this.upgradeBtn.dataset.affordable
      return
    }

    const deficit = Math.max(0, Math.ceil(cost - coins))
    // 金币不足时仍允许点击，由战斗场景给出明确原因，避免按钮因状态同步时序而“偶尔失灵”。
    this.upgradeBtn.disabled = false
    this.upgradeBtn.dataset.affordable = String(deficit === 0)
    this.upgradeBtn.innerHTML = deficit === 0
      ? `<strong>升级</strong><small>${cost} 币</small>`
      : `<strong>升级</strong><small>${cost} 币 · 还差 ${deficit}</small>`
    this.upgradeBtn.title = deficit === 0 ? '点击升级' : `金币不足，还差 ${deficit} 币`
  }

  private onTowerActionFeedback(payload: { message: string }) {
    this.showToast(payload.message)
  }
  private onClearSelection() {
    this.currentTowerInfo = null
    this.tier4BranchesEl.replaceChildren()
    this.tier4BranchesEl.hidden = true
    this.actionPanel.hidden = true
    this.hideTowerPicker()
    this.setHint(HINT_IDLE)
  }

  private onHudUpdate(payload: BattleHudPayload) {
    this.counterEl.textContent = `已部署 ${payload.deployedCount} / ${payload.maxSlots}`
    this.waveValueEl.textContent = String(payload.wave).padStart(2, '0')
    this.enemyCountEl.textContent = String(payload.enemyCount)
    this.coinsEl.textContent = String(Math.round(payload.coins))
    if (!this.towerPicker.hidden) this.refreshTowerAffordability(payload.coins)
    if (this.currentTowerInfo) {
      this.currentTowerInfo.coins = payload.coins
      this.refreshUpgradeButton(payload.coins)
    }
    this.healthEl.textContent = String(payload.health)
    this.healthFillEl.style.width = `${Math.max(0, Math.min(100, (payload.health / payload.maxHealth) * 100))}%`
    this.startWaveButton.disabled = payload.waveActive
    payload.skills.forEach((skill) => {
      const button = this.skillButtons.find((item) => item.dataset.playerSkill === skill.id)
      if (!button) return
      const status = button.querySelector('[data-role="skill-status"]') as HTMLElement
      const cooldown = button.querySelector('[data-role="skill-cooldown"]') as HTMLElement
      if (skill.level === 0) status.textContent = '未解锁 · 指挥中心研发'
      else if (!payload.waveActive) status.textContent = `LV.${skill.level} · 等待敌军`
      else if (skill.remaining > 0) status.textContent = `LV.${skill.level} · 冷却中`
      else status.textContent = `LV.${skill.level} · 可释放`
      cooldown.textContent = skill.remaining > 0 ? `${skill.remaining.toFixed(1)}s` : ''
      button.style.setProperty('--cooldown-fill', `${skill.cooldown > 0 ? (skill.remaining / skill.cooldown) * 100 : 0}%`)
      button.disabled = skill.level === 0 || !payload.waveActive || skill.remaining > 0
    })
    if (this.currentSpeed !== payload.speed) {
      this.currentSpeed = payload.speed as 1 | 2 | 3
      this.refreshSpeedButtons()
    }
  }

  private onWaveCleared(payload: WaveClearedPayload) {
    this.showToast(`波次完成 · ${payload.reward} G · 下一波 12 秒后抵达`)
  }

  private onEarlyWaveBonus(payload: { wave: number; reward: number }) {
    this.showToast(`提前开启波次 ${payload.wave} · 战备奖励 +${payload.reward} G`)
  }

  private onSpecialEventStarted(payload: SpecialEventPayload) {
    window.clearTimeout(this.specialEventTimer)
    this.specialEventBanner.dataset.tone = payload.tone
    this.specialEventKicker.textContent = payload.tone === 'good' ? 'FAVORABLE STREET EVENT' : 'HOSTILE STREET EVENT'
    this.specialEventSource.textContent = payload.source
    this.specialEventTitle.textContent = payload.title
    this.specialEventDescription.textContent = payload.description
    this.specialEventEffect.textContent = payload.durationSeconds > 0
      ? `${payload.effectLabel} · ${payload.durationSeconds} 秒`
      : payload.effectLabel
    this.specialEventBanner.hidden = false
    if (payload.durationSeconds === 0) {
      this.specialEventTimer = window.setTimeout(() => {
        this.specialEventBanner.hidden = true
      }, 4800)
    }
  }

  private onTacticalAlert(payload: TacticalAlertPayload) {
    window.clearTimeout(this.tacticalAlertTimer)
    this.specialEventBanner.dataset.tone = 'bad'
    this.specialEventKicker.textContent = 'TACTICAL ALERT // HEAVY HOSTILE'
    this.specialEventSource.textContent = payload.enemyType.toUpperCase()
    this.specialEventTitle.textContent = payload.title
    this.specialEventDescription.textContent = payload.description
    this.specialEventEffect.textContent = payload.effect
    this.specialEventBanner.hidden = false
    this.tacticalAlertTimer = window.setTimeout(() => {
      this.specialEventBanner.hidden = true
    }, 6000)
  }

  private onSpecialEventEnded(payload: { id: string; title: string }) {
    window.clearTimeout(this.specialEventTimer)
    this.specialEventBanner.hidden = true
    this.showToast(`${payload.title} · 信号已消散`)
  }

  private showToast(message: string) {
    this.toast.textContent = message
    this.toast.classList.add('visible')
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('visible'), 3400)
  }

  private onVictory(payload: { newlyUnlocked: boolean; demoActive?: boolean }) {
    this.endTitle.textContent = '基地安然无恙'
    this.endTitle.className = 'victory'
    this.endSubtitle.textContent = payload.demoActive
      ? 'AUTO 演示不会保存进度或解锁关卡'
      : payload.newlyUnlocked ? '已解锁下一张地图' : '本关已通关'
    this.endOverlay.hidden = false
  }

  private onGameOver() {
    this.endTitle.textContent = '基地失守'
    this.endTitle.className = 'defeat'
    this.endSubtitle.textContent = '防线已被攻破,返回指挥中心重新部署'
    this.endOverlay.hidden = false
  }
}





