import type Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig'
import { TOWER_TYPES, type TowerId } from '../data/towers'
import { EventBus, GameEvents, type BattleHudPayload, type SlotSelectedPayload, type WaveClearedPayload } from '../state/EventBus'
import { REGISTRY_KEY, type CampaignState } from '../state/CampaignState'
import { MUSIC_REGISTRY_KEY, VOICE_REGISTRY_KEY, type MusicController, type VoiceSystem } from '../audio'

interface TowerInfoPayload {
  towerId: string
  typeId: TowerId
  name: string
  role: string
  level: number
  maxLevel: number
  upgradeCost: number | null
  sellValue: number
  damageDealt: number
  attacks: number
  coins: number
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
  private readonly hintEl: HTMLElement
  private readonly towerPicker: HTMLElement
  private readonly pickerClose: HTMLButtonElement
  private readonly actionPanel: HTMLElement
  private readonly actionName: HTMLElement
  private readonly actionStats: HTMLElement
  private readonly upgradeBtn: HTMLButtonElement
  private readonly sellBtn: HTMLButtonElement
  private readonly endOverlay: HTMLElement
  private readonly endTitle: HTMLElement
  private readonly endSubtitle: HTMLElement
  private readonly voiceToggle: HTMLButtonElement
  private readonly musicToggle: HTMLButtonElement
  private readonly resetButton: HTMLButtonElement
  private readonly intelPanel: HTMLElement
  private readonly intelContent: HTMLElement
  private readonly helpPanel: HTMLElement

  private currentSpeed: 1 | 2 | 3 = 1
  private currentTowerInfo: TowerInfoPayload | null = null
  private pendingSlot: SlotSelectedPayload | null = null
  private toastTimer: number | undefined

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
    this.hintEl = document.getElementById('hint') as HTMLElement
    this.towerPicker = document.getElementById('tower-picker') as HTMLElement
    this.pickerClose = document.getElementById('picker-close') as HTMLButtonElement
    this.actionPanel = document.getElementById('tower-actions') as HTMLElement
    this.actionName = document.getElementById('tower-actions-name') as HTMLElement
    this.actionStats = document.getElementById('tower-actions-stats') as HTMLElement
    this.upgradeBtn = document.getElementById('tower-upgrade') as HTMLButtonElement
    this.sellBtn = document.getElementById('tower-sell') as HTMLButtonElement
    this.endOverlay = document.getElementById('end-overlay') as HTMLElement
    this.endTitle = document.getElementById('end-title') as HTMLElement
    this.endSubtitle = document.getElementById('end-subtitle') as HTMLElement
    this.voiceToggle = document.getElementById('hud-toggle-voice') as HTMLButtonElement
    this.musicToggle = document.getElementById('hud-toggle-music') as HTMLButtonElement
    this.resetButton = document.getElementById('reset-deployment') as HTMLButtonElement
    this.intelPanel = document.getElementById('intel-panel') as HTMLElement
    this.intelContent = document.getElementById('intel-content') as HTMLElement
    this.helpPanel = document.getElementById('help-panel') as HTMLElement

    this.buildTowerPicker()
    this.buildIntelContent()
    this.bindSpeedButtons()
    this.bindStartWave()
    this.bindActionButtons()
    this.bindAudioToggles()
    this.bindReturnButtons()
    this.bindResetButton()
    this.bindPickerClose()
    this.bindOverlayToggles()

    EventBus.on(GameEvents.HudUpdate, this.onHudUpdate, this)
    EventBus.on(GameEvents.SlotClicked, this.onSlotClicked, this)
    EventBus.on(GameEvents.TowerInfoUpdate, this.onTowerInfo, this)
    EventBus.on(GameEvents.ClearSelection, this.onClearSelection, this)
    EventBus.on(GameEvents.WaveCleared, this.onWaveCleared, this)
    EventBus.on(GameEvents.EarlyWaveBonus, this.onEarlyWaveBonus, this)
    EventBus.on(GameEvents.Victory, this.onVictory, this)
    EventBus.on(GameEvents.GameOver, this.onGameOver, this)
  }

  /** 每次进入新的一局战斗前重置界面状态,对应旧 UiScene.create() 的初始化。 */
  reset() {
    this.currentTowerInfo = null
    this.pendingSlot = null
    this.hideTowerPicker()
    this.actionPanel.hidden = true
    this.endOverlay.hidden = true
    this.intelPanel.hidden = true
    this.helpPanel.hidden = true
    this.toast.classList.remove('visible')
    this.setHint(HINT_IDLE)
    const campaign = this.game.registry.get(REGISTRY_KEY) as CampaignState | undefined
    this.currentSpeed = campaign?.gameSpeed ?? 1
    this.refreshSpeedButtons()
    this.syncAudioLabels()
  }

  private voice(): VoiceSystem | undefined {
    return this.game.registry.get(VOICE_REGISTRY_KEY) as VoiceSystem | undefined
  }

  private music(): MusicController | undefined {
    return this.game.registry.get(MUSIC_REGISTRY_KEY) as MusicController | undefined
  }

  private setHint(text: string) {
    this.hintEl.textContent = text
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
    TOWER_TYPES.forEach((def) => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'tower-option'
      card.style.borderColor = def.accent
      card.innerHTML = `<img src="${def.image}" alt="${def.name}" /><strong>${def.name}</strong><small>${def.role}</small><em>${def.cost} 币</em>`
      card.addEventListener('click', (event) => {
        event.stopPropagation()
        this.confirmBuild(def.id)
      })
      this.towerPicker.appendChild(card)
    })
  }

  private buildIntelContent() {
    const rows = TOWER_TYPES.map(
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
    this.intelContent.innerHTML = `<div class="intel-tower-list">${rows}</div>`
  }

  private confirmBuild(typeId: TowerId) {
    if (!this.pendingSlot) return
    const cost = TOWER_TYPES.find((t) => t.id === typeId)!.cost
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
    if (payload.upgradeCost != null) {
      this.upgradeBtn.innerHTML = `<strong>升级</strong><small>${payload.upgradeCost} 币</small>`
      this.upgradeBtn.disabled = payload.coins < payload.upgradeCost
    } else {
      this.upgradeBtn.innerHTML = '<strong>已满级</strong>'
      this.upgradeBtn.disabled = true
    }
    this.sellBtn.innerHTML = `<strong>拆除</strong><small>返还 ${payload.sellValue} 币</small>`
    this.setHint(HINT_TOWER_SELECTED)
  }

  private onClearSelection() {
    this.currentTowerInfo = null
    this.actionPanel.hidden = true
    this.hideTowerPicker()
    this.setHint(HINT_IDLE)
  }

  private onHudUpdate(payload: BattleHudPayload) {
    this.counterEl.textContent = `已部署 ${payload.deployedCount} / ${payload.maxSlots}`
    this.waveValueEl.textContent = String(payload.wave).padStart(2, '0')
    this.enemyCountEl.textContent = String(payload.enemyCount)
    this.coinsEl.textContent = String(Math.round(payload.coins))
    this.healthEl.textContent = String(payload.health)
    this.healthFillEl.style.width = `${Math.max(0, Math.min(100, (payload.health / payload.maxHealth) * 100))}%`
    this.startWaveButton.disabled = payload.waveActive
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

  private showToast(message: string) {
    this.toast.textContent = message
    this.toast.classList.add('visible')
    window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('visible'), 3400)
  }

  private onVictory(payload: { newlyUnlocked: boolean }) {
    this.endTitle.textContent = '基地安然无恙'
    this.endTitle.className = 'victory'
    this.endSubtitle.textContent = payload.newlyUnlocked ? '已解锁下一张地图' : '本关已通关'
    this.endOverlay.hidden = false
  }

  private onGameOver() {
    this.endTitle.textContent = '基地失守'
    this.endTitle.className = 'defeat'
    this.endSubtitle.textContent = '防线已被攻破,返回指挥中心重新部署'
    this.endOverlay.hidden = false
  }
}
