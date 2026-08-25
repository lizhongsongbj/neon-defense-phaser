import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig'
import { MAP_LEVELS, CAMPAIGN_WAVE_COUNTS, CAMPAIGN_STARTING_COINS, type MapLevel, type Point2 } from '../data/maps'
import { TOWER_COMBAT, TOWER_TYPE_BY_ID, type TowerId } from '../data/towers'
import { ALL_TOWER_TYPE_BY_ID, type AllTowerId } from '../data/towerExpansion'
import { scaleReward, towerGrowthBonuses, RANGE_PROJECTION_Y, MAX_HEALTH, type Difficulty } from '../data/balance'
import { COUNTDOWN_SECONDS, earlyWaveReward } from '../data/waveEconomy'
import { buildMapGeometry, toBoardUnits, type MapGeometry } from '../systems/PathSystem'
import { buildWavePlan, scheduleWave } from '../systems/WaveSpawner'
import { spawnEnemy, enemyPosition, isEnemyPhasedAt, tickEnemyTraits } from '../systems/CombatSystem'
import { resolveTowerAttack, effectiveRange } from '../systems/towerBehaviors'
import { tickEnforcer } from '../systems/bossBehaviors/Enforcer'
import { tickEve } from '../systems/bossBehaviors/Eve'
import { towerUpgradeCost, towerRefundValue } from '../systems/Economy'
import { ENFORCER_COMPONENT_EVENT } from '../systems/CombatSystem'
import type { BattleState, EnemyState, TowerState, WaveRosterEntry } from '../systems/types'
import { EnemyActor } from '../entities/EnemyActor'
import { TowerActor } from '../entities/TowerActor'
import { MercenaryActor } from '../entities/MercenaryActor'
import { DroneSquadActor } from '../entities/DroneSquadActor'
import { EffectsLayer } from '../entities/EffectsLayer'
import { CampaignState, REGISTRY_KEY } from '../state/CampaignState'
import { EventBus, GameEvents, type BattleHudPayload } from '../state/EventBus'
import { ENEMY_TYPES } from '../data/enemies'
import { chooseSpecialEvent, specialEventHistory, specialEventTriggerDelay, type SpecialEventDefinition, type SpecialEventId } from '../data/specialEvents'
import { BOSS_TYPES, type BossId } from '../data/bosses'
import type { SavedTower } from '../systems/SaveGame'
import { EnemySpawnSfx, MUSIC_REGISTRY_KEY, VOICE_REGISTRY_KEY, type MusicController, type VoiceCategory, type VoiceSystem } from '../audio'
import { PLAYER_SKILLS, PLAYER_SKILL_BY_ID, playerSkillCooldown, type PlayerSkillId } from '../data/playerSkills'

function boardToScreen(p: Point2): Point2 {
  return { x: (p.x / 1000) * GAME_WIDTH, y: (p.y / 1000) * GAME_HEIGHT }
}

/** 敌人/塔图片基准尺寸,原版用 vw 百分比表示,这里按画布宽度换算 */
function spriteSize(scale: number): number {
  return Math.max(28, scale * GAME_WIDTH)
}

const BASE_DAMAGE_VOICE_INTERVAL_MS = 20_000

interface ActiveFirewall {
  point: Point2
  expiresAt: number
  affected: Set<number>
  capacity: number
  graphic: Phaser.GameObjects.Graphics
  label: Phaser.GameObjects.Text
}

export class BattleScene extends Phaser.Scene {
  private campaign!: CampaignState
  private mapLevel!: MapLevel
  private geometry!: MapGeometry
  private battle!: BattleState
  private totalWaves = 5

  private towerActors = new Map<string, TowerActor>()
  private enemyActors = new Map<number, EnemyActor>()
  private mercActors = new Map<string, MercenaryActor>()
  private droneActors = new Map<string, DroneSquadActor>()
  private slotMarkers: Phaser.GameObjects.Zone[] = []
  private effects!: EffectsLayer

  private selectedTowerId: string | null = null
  private waveActive = false
  private waveElapsed = 0
  private waveQueue: Array<WaveRosterEntry & { spawnAt: number }> = []
  private ended = false
  private hudTimer = 0
  private voice!: VoiceSystem
  private music!: MusicController
  private enemySpawnSfx!: EnemySpawnSfx
  private lastBaseDamageSfxAt = -Infinity
  private lastBaseDamageVoiceAt = -Infinity
  private activeSpecialEvent: SpecialEventDefinition | null = null
  private pendingSpecialEvent: SpecialEventDefinition | null = null
  private specialEventTriggerAt = Infinity
  private specialEventEndsAt = Infinity
  private specialEventsTriggered = 0
  private readonly usedSpecialEventIds = new Set<SpecialEventId>()
  private readonly heavyEnemyAlertsShown = new Set<string>()
  /** 下一波整备倒计时(秒),原 `_0x3ebe3b`;0 表示战斗中或需要玩家手动发动 */
  private nextWaveCountdown = 0
  private skillCooldowns: Record<PlayerSkillId, number> = { 'pulse-overload': 0, 'quantum-firewall': 0 }
  private targetingSkill: PlayerSkillId | null = null
  private targetingOverlay: Phaser.GameObjects.Zone | null = null
  private targetingReticle: Phaser.GameObjects.Graphics | null = null
  private activeFirewalls: ActiveFirewall[] = []

  constructor() {
    super('Battle')
  }

  create() {
    this.ended = false
    this.selectedTowerId = null
    this.towerActors.clear()
    this.enemyActors.clear()
    this.mercActors.clear()
    this.droneActors.clear()
    this.slotMarkers = []
    this.lastBaseDamageSfxAt = -Infinity
    this.lastBaseDamageVoiceAt = -Infinity
    this.activeSpecialEvent = null
    this.pendingSpecialEvent = null
    this.specialEventTriggerAt = Infinity
    this.specialEventEndsAt = Infinity
    this.specialEventsTriggered = 0
    this.usedSpecialEventIds.clear()
    this.heavyEnemyAlertsShown.clear()
    this.skillCooldowns = { 'pulse-overload': 0, 'quantum-firewall': 0 }
    this.targetingSkill = null
    this.targetingOverlay = null
    this.targetingReticle = null
    this.activeFirewalls = []

    this.campaign = this.game.registry.get(REGISTRY_KEY) as CampaignState
    this.voice = this.game.registry.get(VOICE_REGISTRY_KEY) as VoiceSystem
    this.music = this.game.registry.get(MUSIC_REGISTRY_KEY) as MusicController
    this.enemySpawnSfx = new EnemySpawnSfx()
    this.mapLevel = MAP_LEVELS[this.campaign.mapIndex]
    EventBus.emit(GameEvents.AchievementSignal, {
      type: 'mission-start',
      mapIndex: this.campaign.mapIndex,
      difficulty: this.campaign.difficulty,
      demoActive: this.campaign.demoActive,
    })
    this.geometry = buildMapGeometry(this.mapLevel)
    this.totalWaves = CAMPAIGN_WAVE_COUNTS[this.campaign.mapIndex] ?? 5
    this.effects = new EffectsLayer(this)
    void this.music?.playMap(this.campaign.mapIndex)

    this.battle = {
      mapIndex: this.campaign.mapIndex,
      difficulty: this.campaign.difficulty,
      geometry: this.geometry,
      wave: this.campaign.wave,
      coins: this.campaign.coins,
      health: this.campaign.health,
      kills: 0,
      leaks: 0,
      towers: [],
      enemies: [],
      enemySequence: 1,
      now: 0,
    }

    const eventHistory = specialEventHistory(this.battle.mapIndex, this.battle.wave)
    this.specialEventsTriggered = eventHistory.triggeredCount
    for (const eventId of eventHistory.usedIds) this.usedSpecialEventIds.add(eventId)

    this.drawMapBackground()

    if (this.mapLevel.available) {
      this.drawPaths()
      this.drawSlots()
    }
    this.restoreSavedTowers()

    this.nextWaveCountdown = 0

    this.bindBusEvents()
    this.emitHud()

    this.events.once('shutdown', () => this.teardown())
  }

  private drawMapBackground() {
    const mapKey = `map-${this.campaign.mapIndex}`
    const background = this.textures.exists(mapKey)
      ? this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, mapKey).setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      : this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050b10)

    background
      .setDepth(-20)
      .setInteractive()
      .on('pointerdown', () => this.clearSelection())

    if (!this.mapLevel.available) {
      const grid = this.add.graphics()
      grid.lineStyle(1, 0x17313a, 0.55)
      for (let x = 0; x <= GAME_WIDTH; x += 64) grid.lineBetween(x, 0, x, GAME_HEIGHT)
      for (let y = 0; y <= GAME_HEIGHT; y += 64) grid.lineBetween(0, y, GAME_WIDTH, y)
      grid.lineStyle(2, 0x20f4e6, 0.2)
      grid.strokeRect(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48)

      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 18, '关卡地图已清空', {
          fontFamily: 'sans-serif',
          fontSize: '34px',
          fontStyle: 'bold',
          color: '#20f4e6',
        })
        .setOrigin(0.5)
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 28, '等待接入新版地图、美术、路线与防御节点', {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#7c9aa3',
        })
        .setOrigin(0.5)
    }

    return background
  }

  private drawPaths() {
    // 路线仍由 geometry 驱动怪物移动，但不在画面上绘制调试路线标识。
  }

  private drawSlots() {
    this.mapLevel.slots.forEach((slot, index) => {
      const screen = boardToScreen(toBoardUnits(slot))
      const radius = Math.max(18, spriteSize(slot.scale) * 0.34)
      // Zone 本身不绘制任何内容，但提供稳定的不可见点击区域。
      const marker = this.add
        .zone(screen.x, screen.y, (radius + 8) * 2, (radius + 8) * 2)
        .setOrigin(0.5)
        .setDepth(2)
      marker.setInteractive()
      marker.input!.cursor = 'pointer'
      marker.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation()
        this.onSlotClicked(index)
      })
      this.slotMarkers[index] = marker
    })
  }

  private restoreSavedTowers() {
    const saved = this.campaign.savedTowers ?? []
    for (const s of saved) {
      this.instantiateTower(s.slot, s.type, {
        level: s.level as 1 | 2 | 3,
        spent: s.spent,
        rallyPoint: s.rallyX != null && s.rallyY != null ? { x: s.rallyX, y: s.rallyY } : null,
      })
    }
  }

  private bindBusEvents() {
    EventBus.on(GameEvents.BuildTower, this.onBuildTowerRequest, this)
    EventBus.on(GameEvents.UpgradeTower, this.onUpgradeRequest, this)
    EventBus.on(GameEvents.SellTower, this.onSellRequest, this)
    EventBus.on(GameEvents.SetSpeed, this.onSetSpeed, this)
    EventBus.on(GameEvents.ReturnToCommandCenter, this.onReturnToCommandCenter, this)
    EventBus.on(GameEvents.StartNextWave, this.onStartWaveRequest, this)
    EventBus.on(GameEvents.ResetDeployment, this.onResetDeployment, this)
    EventBus.on(GameEvents.RestartBattle, this.onRestartBattleRequest, this)
    EventBus.on(GameEvents.ActivatePlayerSkill, this.onActivatePlayerSkillRequest, this)
  }

  private teardown() {
    this.effects?.destroy()
    this.enemySpawnSfx?.destroy()
    this.cancelSkillTargeting()
    this.activeFirewalls.forEach((firewall) => { this.tweens.killTweensOf(firewall.graphic); firewall.graphic.destroy(); firewall.label.destroy() })
    this.activeFirewalls = []
    EventBus.off(GameEvents.BuildTower, this.onBuildTowerRequest, this)
    EventBus.off(GameEvents.UpgradeTower, this.onUpgradeRequest, this)
    EventBus.off(GameEvents.SellTower, this.onSellRequest, this)
    EventBus.off(GameEvents.SetSpeed, this.onSetSpeed, this)
    EventBus.off(GameEvents.ReturnToCommandCenter, this.onReturnToCommandCenter, this)
    EventBus.off(GameEvents.StartNextWave, this.onStartWaveRequest, this)
    EventBus.off(GameEvents.ResetDeployment, this.onResetDeployment, this)
    EventBus.off(GameEvents.RestartBattle, this.onRestartBattleRequest, this)
    EventBus.off(GameEvents.ActivatePlayerSkill, this.onActivatePlayerSkillRequest, this)
  }

  private onActivatePlayerSkillRequest(payload: { skillId: PlayerSkillId }) {
    const id = payload.skillId
    if (this.targetingSkill === id) {
      this.cancelSkillTargeting()
      return
    }
    const level = this.campaign.playerSkillLevel(id)
    if (level <= 0) {
      EventBus.emit(GameEvents.PlayerSkillFeedback, { message: `${PLAYER_SKILL_BY_ID[id].name}尚未解锁` })
      return
    }
    if (!this.waveActive || this.battle.enemies.length === 0) {
      EventBus.emit(GameEvents.PlayerSkillFeedback, { message: '当前没有可锁定的敌军信号' })
      return
    }
    if (this.skillCooldowns[id] > 0) {
      EventBus.emit(GameEvents.PlayerSkillFeedback, { message: `协议冷却中 · ${this.skillCooldowns[id].toFixed(1)} 秒` })
      return
    }
    this.beginSkillTargeting(id)
  }

  private beginSkillTargeting(id: PlayerSkillId) {
    this.cancelSkillTargeting(false)
    this.targetingSkill = id
    const accent = id === 'pulse-overload' ? 0x20f4e6 : 0xff3ea5
    const radius = id === 'pulse-overload' ? 190 : 88
    this.targetingReticle = this.add.graphics().setDepth(101)
    const drawReticle = (x: number, y: number) => {
      this.targetingReticle?.clear()
      this.targetingReticle?.lineStyle(2, accent, 0.95).strokeCircle(x, y, radius)
      this.targetingReticle?.lineStyle(1, accent, 0.35).strokeCircle(x, y, Math.max(20, radius - 12))
      this.targetingReticle?.lineBetween(x - 15, y, x + 15, y)
      this.targetingReticle?.lineBetween(x, y - 15, x, y + 15)
    }
    drawReticle(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    this.targetingOverlay = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT).setDepth(100).setInteractive({ cursor: 'crosshair' })
    this.targetingOverlay.on('pointermove', (pointer: Phaser.Input.Pointer) => drawReticle(pointer.worldX, pointer.worldY))
    this.targetingOverlay.once('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation()
      this.executePlayerSkill(id, { x: pointer.worldX, y: pointer.worldY })
    })
    EventBus.emit(GameEvents.PlayerSkillTargeting, { skillId: id })
  }

  private cancelSkillTargeting(notify = true) {
    this.targetingOverlay?.destroy()
    this.targetingReticle?.destroy()
    this.targetingOverlay = null
    this.targetingReticle = null
    this.targetingSkill = null
    if (notify) EventBus.emit(GameEvents.PlayerSkillTargeting, { skillId: null })
  }

  private executePlayerSkill(id: PlayerSkillId, point: Point2) {
    const level = this.campaign.playerSkillLevel(id)
    if (level <= 0 || this.skillCooldowns[id] > 0 || !this.waveActive) {
      this.cancelSkillTargeting()
      return
    }
    if (id === 'pulse-overload') this.castPulseOverload(point)
    else this.castQuantumFirewall(point)
    this.skillCooldowns[id] = playerSkillCooldown(id, level)
    this.cancelSkillTargeting()
    this.emitHud()
  }

  private castPulseOverload(point: Point2) {
    const radius = 190
    let affected = 0
    let shieldsDisrupted = 0
    for (const enemy of this.battle.enemies) {
      if (enemy.dead) continue
      const screen = boardToScreen(enemyPosition(this.geometry, enemy))
      if (Phaser.Math.Distance.Between(point.x, point.y, screen.x, screen.y) > radius) continue
      affected += 1
      const stunMs = enemy.isBoss ? 0 : enemy.elite ? 1000 : 2000
      enemy.stunnedUntil = Math.max(enemy.stunnedUntil, this.battle.now + stunMs)
      enemy.skillSlowAmount = Math.max(enemy.skillSlowAmount, enemy.isBoss ? 0.15 : enemy.elite ? 0.28 : 0.35)
      enemy.skillSlowUntil = Math.max(enemy.skillSlowUntil, this.battle.now + 5500)
      if (enemy.shield > 0) {
        enemy.shield = Math.max(0, enemy.shield - enemy.maxShield * 0.25)
        enemy.shieldBlockedUntil = Math.max(enemy.shieldBlockedUntil, this.battle.now + 3500)
        shieldsDisrupted += 1
      }
      this.playPulseTargetBurst(screen)
    }

    this.cameras.main.shake(260, 0.009, true)
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x8fffff, 0.16).setDepth(69)
    this.tweens.add({ targets: flash, alpha: 0, duration: 230, onComplete: () => flash.destroy() })
    ;[0, 90, 180].forEach((delay, index) => {
      const ring = this.add.graphics().setDepth(70)
      ring.fillStyle(0x20f4e6, index === 0 ? 0.16 : 0.05).fillCircle(point.x, point.y, radius)
      ring.lineStyle(index === 0 ? 5 : 3, index === 1 ? 0xffffff : 0x20f4e6, 1).strokeCircle(point.x, point.y, radius)
      ring.lineStyle(1, 0x73fff5, 0.75).strokeCircle(point.x, point.y, radius * 0.58)
      ring.setScale(0.08)
      ring.setAlpha(0)
      this.tweens.add({ targets: ring, scale: 1.18 + index * 0.08, alpha: { from: 1, to: 0 }, delay, duration: 820, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() })
    })
    const core = this.add.graphics().setDepth(71)
    core.fillStyle(0xffffff, 0.92).fillCircle(point.x, point.y, 18)
    core.lineStyle(5, 0x20f4e6, 0.95).strokeCircle(point.x, point.y, 34)
    this.tweens.add({ targets: core, scale: 2.6, alpha: 0, duration: 420, onComplete: () => core.destroy() })
    const label = this.add.text(point.x, point.y - 34, 'PULSE OVERRIDE // SYSTEM SHOCK', { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#042126ee', padding: { x: 9, y: 5 } }).setOrigin(0.5).setDepth(72)
    this.tweens.add({ targets: label, y: label.y - 34, alpha: 0, duration: 1150, onComplete: () => label.destroy() })
    EventBus.emit(GameEvents.PlayerSkillFeedback, { message: `脉冲过载爆发 · 控制 ${affected} 个目标${shieldsDisrupted ? ` · 击穿 ${shieldsDisrupted} 层护盾` : ''}` })
  }

  private playPulseTargetBurst(point: Point2) {
    const burst = this.add.graphics().setDepth(73)
    burst.lineStyle(3, 0xcffffb, 0.95)
    for (let arm = 0; arm < 6; arm += 1) {
      const angle = (Math.PI * 2 * arm) / 6
      const innerX = point.x + Math.cos(angle) * 12
      const innerY = point.y + Math.sin(angle) * 12
      const outerX = point.x + Math.cos(angle) * 42
      const outerY = point.y + Math.sin(angle) * 42
      burst.lineBetween(innerX, innerY, outerX, outerY)
    }
    burst.fillStyle(0x20f4e6, 0.75).fillCircle(point.x, point.y, 8)
    this.tweens.add({ targets: burst, scale: 1.45, alpha: 0, duration: 520, onComplete: () => burst.destroy() })
  }

  private castQuantumFirewall(point: Point2) {
    const radius = 88
    const graphic = this.add.graphics().setDepth(66)
    graphic.fillStyle(0xff3ea5, 0.14).fillCircle(point.x, point.y, radius)
    graphic.lineStyle(5, 0xff3ea5, 1).strokeCircle(point.x, point.y, radius)
    graphic.lineStyle(2, 0x20f4e6, 0.95).strokeCircle(point.x, point.y, radius - 12)
    graphic.fillStyle(0x20f4e6, 0.18).fillRect(point.x - 76, point.y - 42, 152, 84)
    graphic.lineStyle(4, 0xff78c1, 0.95)
    graphic.lineBetween(point.x - 78, point.y - 42, point.x + 78, point.y - 42)
    graphic.lineBetween(point.x - 78, point.y + 42, point.x + 78, point.y + 42)
    for (let x = -66; x <= 66; x += 22) {
      graphic.lineStyle(2, x % 44 === 0 ? 0xffffff : 0x20f4e6, 0.85)
      graphic.strokeRect(point.x + x - 7, point.y - 36, 14, 72)
    }
    const label = this.add.text(point.x, point.y - 66, 'QUANTUM FIREWALL // 12', { fontFamily: 'monospace', fontSize: '12px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#2a0620e6', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(68)
    this.tweens.add({ targets: graphic, alpha: 0.58, duration: 260, yoyo: true, repeat: -1 })
    this.tweens.add({ targets: label, scaleX: 1.05, scaleY: 1.05, duration: 360, yoyo: true, repeat: -1 })
    this.cameras.main.shake(150, 0.004, true)
    this.activeFirewalls.push({ point, expiresAt: this.battle.now + 8000, affected: new Set(), capacity: 12, graphic, label })
    EventBus.emit(GameEvents.PlayerSkillFeedback, { message: '量子防火墙强化部署 · 容量 12 · 持续 8 秒' })
  }

  private tickQuantumFirewalls() {
    for (let i = this.activeFirewalls.length - 1; i >= 0; i -= 1) {
      const firewall = this.activeFirewalls[i]
      if (this.battle.now >= firewall.expiresAt || firewall.capacity <= 0) {
        this.tweens.killTweensOf(firewall.graphic)
        this.tweens.killTweensOf(firewall.label)
        firewall.graphic.destroy()
        firewall.label.destroy()
        this.activeFirewalls.splice(i, 1)
        continue
      }
      for (const enemy of this.battle.enemies) {
        if (enemy.dead || firewall.affected.has(enemy.id)) continue
        const screen = boardToScreen(enemyPosition(this.geometry, enemy))
        if (Phaser.Math.Distance.Between(firewall.point.x, firewall.point.y, screen.x, screen.y) > 88) continue
        firewall.affected.add(enemy.id)
        firewall.capacity -= 1
        firewall.label.setText(`QUANTUM FIREWALL // ${firewall.capacity}`)
        enemy.distance = Math.max(0, enemy.distance - (enemy.isBoss ? 0 : enemy.elite ? 24 : 50))
        enemy.attackSuppression = Math.max(enemy.attackSuppression, enemy.isBoss ? 0.08 : enemy.elite ? 0.18 : 0.35)
        enemy.attackSuppressedUntil = Math.max(enemy.attackSuppressedUntil, this.battle.now + (enemy.isBoss ? 3500 : 6000))
        enemy.skillSlowAmount = Math.max(enemy.skillSlowAmount, enemy.isBoss ? 0.05 : enemy.elite ? 0.1 : 0.2)
        enemy.skillSlowUntil = Math.max(enemy.skillSlowUntil, this.battle.now + 3200)
        const impact = this.add.graphics().setDepth(72)
        impact.lineStyle(4, 0xff3ea5, 1).strokeRect(screen.x - 28, screen.y - 28, 56, 56)
        impact.lineStyle(2, 0x20f4e6, 0.9).strokeCircle(screen.x, screen.y, 38)
        this.tweens.add({ targets: impact, scale: 1.45, alpha: 0, duration: 560, onComplete: () => impact.destroy() })
        const denied = this.add.text(screen.x, screen.y - 34, 'ACCESS DENIED // ROLLBACK', { fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#5a083be8', padding: { x: 6, y: 4 } }).setOrigin(0.5).setDepth(73)
        this.tweens.add({ targets: denied, y: denied.y - 24, alpha: 0, duration: 900, onComplete: () => denied.destroy() })
        if (firewall.capacity <= 0) break
      }
    }
  }

  /** AUTO 演示代理请求切换/重开某关卡,原 `window.restartCampaignBattle` */
  private onRestartBattleRequest(payload: { mapIndex: number; difficulty: Difficulty }) {
    this.campaign.demoActive = true
    this.campaign.difficulty = payload.difficulty
    this.campaign.startMission(payload.mapIndex)
    this.scene.restart()
  }

  private onSlotClicked(slotIndex: number) {
    const existing = this.battle.towers.find((t) => t.slotIndex === slotIndex)
    if (existing) {
      this.selectTower(existing.id)
      return
    }
    const slot = this.mapLevel.slots[slotIndex]
    const screen = boardToScreen(toBoardUnits(slot))
    this.clearSelection()
    EventBus.emit(GameEvents.SlotClicked, {
      slotIndex,
      screenX: screen.x,
      screenY: screen.y,
      hasTower: false,
      coins: this.battle.coins,
    })
  }

  private onBuildTowerRequest(payload: { slotIndex: number; typeId: AllTowerId }) {
    const { slotIndex, typeId } = payload
    if (this.battle.towers.some((t) => t.slotIndex === slotIndex)) return
    const cost = ALL_TOWER_TYPE_BY_ID[typeId].cost
    if (this.battle.coins < cost) return
    this.battle.coins -= cost
    this.instantiateTower(slotIndex, typeId, { level: 1, spent: cost, rallyPoint: null })
    if (typeId in TOWER_TYPE_BY_ID) this.voice?.play(typeId as TowerId, 'build')
    this.persistProgress()
    this.emitHud()
    EventBus.emit(GameEvents.ClearSelection)
  }

  private instantiateTower(
    slotIndex: number,
    typeId: AllTowerId,
    opts: { level: 1 | 2 | 3; spent: number; rallyPoint: { x: number; y: number } | null },
  ) {
    const slot = this.mapLevel.slots[slotIndex]
    const tower: TowerState = {
      id: `t${slotIndex}`,
      typeId,
      slotIndex,
      source: toBoardUnits(slot),
      rangeScale: slot.rangeScale ?? 1,
      level: opts.level,
      spent: opts.spent,
      cooldown: 0,
      targetId: null,
      rallyPoint: opts.rallyPoint,
      mercs: null,
      damageDealt: 0,
      utility: 0,
      attacks: 0,
    }
    this.battle.towers.push(tower)
    EventBus.emit(GameEvents.AchievementSignal, { type: 'tower-built', towerType: tower.typeId })

    const screen = boardToScreen(tower.source)
    // 素材本身带有不同大小的透明留白；按塔型补偿后，实际可见底座
    // 会刚好覆盖地图上的圆形建造基座。
    const battleScale = typeId in TOWER_TYPE_BY_ID ? TOWER_TYPE_BY_ID[typeId as TowerId].battleScale : 1.5
    const baseSize = spriteSize(slot.scale) * battleScale
    const actor = new TowerActor(this, tower, baseSize).setDepth(20)
    actor.setPosition(screen.x, screen.y)
    actor.onPointerDown(() => this.selectTower(tower.id))
    this.towerActors.set(tower.id, actor)
    if (tower.typeId === 'drone-hive') this.syncDroneActor(tower)
    this.slotMarkers[slotIndex]?.setVisible(false)
  }

  private selectTower(towerId: string) {
    const tower = this.battle.towers.find((t) => t.id === towerId)
    if (!tower) return
    this.clearSelection()
    this.selectedTowerId = towerId
    const growth = towerGrowthBonuses(this.campaign.towerGrowthBonus(tower.typeId))
    const range = effectiveRange(tower, tower.typeId, growth.range)
    const actor = this.towerActors.get(towerId)
    if (actor) {
      const radiusX = (range / 1000) * GAME_WIDTH
      const radiusY = ((range * RANGE_PROJECTION_Y) / 1000) * GAME_HEIGHT
      actor.showRange(radiusX, radiusY)
    }
    if (tower.typeId in TOWER_TYPE_BY_ID) this.voice?.play(tower.typeId as TowerId, 'select', { chance: 0.4 })
    this.emitTowerInfo(tower)
  }

  private clearSelection() {
    if (this.selectedTowerId) {
      this.towerActors.get(this.selectedTowerId)?.hideRange()
    }
    this.selectedTowerId = null
    EventBus.emit(GameEvents.ClearSelection)
  }

  private emitTowerInfo(tower: TowerState) {
    const def = ALL_TOWER_TYPE_BY_ID[tower.typeId]
    EventBus.emit(GameEvents.TowerInfoUpdate, {
      towerId: tower.id,
      typeId: tower.typeId,
      name: def.name,
      role: def.role,
      level: tower.level,
      maxLevel: 3,
      upgradeCost: tower.level < 3 ? towerUpgradeCost(tower.typeId, tower.level) : null,
      sellValue: towerRefundValue(tower.typeId, tower.spent),
      damageDealt: Math.round(tower.damageDealt),
      attacks: tower.attacks,
      coins: this.battle.coins,
    })
  }

  private onUpgradeRequest(payload: { towerId: string }) {
    const tower = this.battle.towers.find((t) => t.id === payload.towerId)
    if (!tower || tower.level >= 3) return
    const cost = towerUpgradeCost(tower.typeId, tower.level)
    if (this.battle.coins < cost) return
    this.battle.coins -= cost
    tower.level = (tower.level + 1) as 1 | 2 | 3
    tower.spent += cost
    this.towerActors.get(tower.id)?.setLevel(tower.level)
    if (tower.typeId in TOWER_TYPE_BY_ID) this.voice?.play(tower.typeId as TowerId, 'upgrade')
    this.persistProgress()
    this.emitHud()
    this.selectTower(tower.id)
  }

  private onSellRequest(payload: { towerId: string }) {
    const index = this.battle.towers.findIndex((t) => t.id === payload.towerId)
    if (index === -1) return
    const tower = this.battle.towers[index]
    const refund = towerRefundValue(tower.typeId, tower.spent)
    this.battle.coins += refund
    if (tower.typeId in TOWER_TYPE_BY_ID) this.voice?.play(tower.typeId as TowerId, 'dismantle')
    this.battle.towers.splice(index, 1)
    this.towerActors.get(tower.id)?.destroy()
    this.towerActors.delete(tower.id)
    this.mercActors.get(tower.id)?.destroy()
    this.mercActors.delete(tower.id)
    this.droneActors.get(tower.id)?.destroy()
    this.droneActors.delete(tower.id)
    this.slotMarkers[tower.slotIndex]?.setVisible(true)
    this.clearSelection()
    this.persistProgress()
    this.emitHud()
  }

  private onSetSpeed(payload: { speed: 1 | 2 | 3 }) {
    this.campaign.gameSpeed = payload.speed
    this.emitHud()
  }

  private onReturnToCommandCenter() {
    // 指挥中心现在是 HTML 层(见 src/main.ts 的导航逻辑),这里只需要停止自己。
    this.scene.stop()
  }

  /** 对应原版 "清空部署" —— 拆除所有已建塔楼,金币/血量重置为本关初始值,不影响波次进度 */
  private onResetDeployment() {
    this.clearSelection()
    for (const actor of this.towerActors.values()) actor.destroy()
    this.towerActors.clear()
    for (const actor of this.mercActors.values()) actor.destroy()
    this.mercActors.clear()
    for (const actor of this.droneActors.values()) actor.destroy()
    this.droneActors.clear()
    this.slotMarkers.forEach((marker) => marker.setVisible(true))
    this.battle.towers = []
    this.battle.coins = CAMPAIGN_STARTING_COINS[this.battle.mapIndex] ?? this.battle.coins
    this.battle.health = MAX_HEALTH
    this.persistProgress()
    this.emitHud()
  }

  /** "发动波次"按钮点击,原 `_0xedb0cb({ rewardEarly: true })`:倒计时未结束则按剩余时间发放战备奖励 */
  private onStartWaveRequest() {
    if (this.ended || this.waveActive) return
    const bonus = this.nextWaveCountdown > 0 ? scaleReward(earlyWaveReward(this.nextWaveCountdown), this.battle.mapIndex) : 0
    if (bonus > 0) {
      this.battle.coins += bonus
      EventBus.emit(GameEvents.EarlyWaveBonus, { wave: this.battle.wave, reward: bonus })
    }
    this.nextWaveCountdown = 0
    this.startWave()
  }

  private startWave() {
    if (this.ended) return
    if (this.battle.wave > this.totalWaves) {
      this.onVictory()
      return
    }
    const roster = buildWavePlan(this.battle.wave, this.battle.mapIndex)
    this.waveQueue = scheduleWave(roster)
    this.waveElapsed = 0
    this.waveActive = true
    this.pendingSpecialEvent = chooseSpecialEvent(
      this.battle.mapIndex,
      this.battle.wave,
      this.usedSpecialEventIds,
      this.specialEventsTriggered,
    )
    this.specialEventTriggerAt = this.pendingSpecialEvent
      ? specialEventTriggerDelay(this.battle.mapIndex, this.battle.wave)
      : Infinity
    this.voice?.play('lan', this.battle.wave === this.totalWaves ? 'finalWave' : 'wave', { chance: 0.7 })
    this.emitHud()
  }

  private spawnFromEntry(entry: WaveRosterEntry) {
    const enemy = spawnEnemy({
      id: this.battle.enemySequence++,
      mapIndex: this.battle.mapIndex,
      wave: this.battle.wave,
      difficulty: this.battle.difficulty,
      now: this.battle.now,
      entry,
    })
    this.battle.enemies.push(enemy)
    const def = enemy.isBoss ? BOSS_TYPES[enemy.typeId as keyof typeof BOSS_TYPES] : ENEMY_TYPES[enemy.typeId as keyof typeof ENEMY_TYPES]
    const heavyDef = enemy.isBoss ? undefined : ENEMY_TYPES[enemy.typeId as keyof typeof ENEMY_TYPES]
    if (heavyDef?.heavy && !this.heavyEnemyAlertsShown.has(enemy.typeId)) {
      this.heavyEnemyAlertsShown.add(enemy.typeId)
      EventBus.emit(GameEvents.TacticalAlert, {
        enemyType: enemy.typeId,
        enemyName: heavyDef.name,
        title: `重型敌人识别：${heavyDef.name}`,
        description: '装甲与战场抗性较高，已标记为重型敌人。建议优先使用针对性火力。',
      })
    }
    const baseSize = spriteSize(def?.size ?? 0.045)
    const actor = new EnemyActor(this, enemy, baseSize).setDepth(30)
    this.enemyActors.set(enemy.id, actor)

    if (enemy.isBoss) {
      const bossId = enemy.typeId as BossId
      this.voice?.play(bossId, 'entrance', { priority: 3 })
      void this.music?.enterBoss(bossId)
    } else {
      if (!this.voice?.muted) this.enemySpawnSfx.play(enemy.typeId, entry.lane === 'left' ? 0.18 : 0.82)
      this.voice?.play(enemy.typeId as VoiceCategory, 'spawn', { chance: 0.3 })
    }
  }

  update(_time: number, deltaMs: number) {
    if (this.ended) return
    const speed = this.campaign.gameSpeed || 1
    const dt = Math.min(deltaMs, 50) * speed
    const dtSeconds = dt / 1000
    PLAYER_SKILLS.forEach(({ id }) => { this.skillCooldowns[id] = Math.max(0, this.skillCooldowns[id] - dtSeconds) })
    this.battle.now += dt

    if (this.waveActive && this.pendingSpecialEvent && this.waveElapsed >= this.specialEventTriggerAt) {
      this.activateSpecialEvent(this.pendingSpecialEvent)
    }
    if (this.activeSpecialEvent && this.battle.now >= this.specialEventEndsAt) {
      this.endSpecialEvent()
    }

    if (this.waveActive) {
      this.waveElapsed += dtSeconds
      while (this.waveQueue.length && this.waveQueue[0].spawnAt <= this.waveElapsed) {
        this.spawnFromEntry(this.waveQueue.shift()!)
      }
    }

    for (const enemy of this.battle.enemies) {
      enemy.blocked = false
    }

    for (const enemy of this.battle.enemies) {
      if (enemy.dead) continue
      if (enemy.typeId === 'enforcer') {
        const voiceEvent = tickEnforcer(enemy, this.battle.mapIndex)
        if (voiceEvent) this.voice?.play('enforcer', voiceEvent, { priority: 2 })
      } else if (enemy.typeId === 'eve') {
        const voiceEvent = tickEve(enemy, this.battle.mapIndex, this.battle.now)
        if (voiceEvent) this.voice?.play('eve', voiceEvent, { priority: 2 })
      }
      enemy.phased = isEnemyPhasedAt(enemy, this.battle.now)
    }

    for (const tower of this.battle.towers) {
      const growth = towerGrowthBonuses(this.campaign.towerGrowthBonus(tower.typeId))
      const towerTimeScale = this.activeSpecialEvent?.modifiers.towerTimeScale ?? 1
      const events = resolveTowerAttack(tower, {
        geometry: this.geometry,
        enemies: this.battle.enemies.filter((e) => !e.dead),
        dt: dtSeconds * towerTimeScale,
        now: this.battle.now,
        growth,
      })
      this.syncMercenaryActor(tower)
      this.syncDroneActor(tower)
      if (events.length) {
        const towerScreen = boardToScreen(tower.source)
        let hackerPulsePlayed = false
        let previousArcTarget: { x: number; y: number } | null = null
        for (const event of events) {
          const target = this.battle.enemies.find((e) => e.id === event.targetId)
          if (target) {
            const targetScreen = boardToScreen(enemyPosition(this.geometry, target))
            if (event.effect === 'mercenary') {
              const origin = this.mercActors.get(tower.id)?.playAttack(event.unitIndex ?? 0, targetScreen)
                ?? boardToScreen(tower.rallyPoint ?? tower.source)
              this.effects.playShot(origin, targetScreen, event.effect)
            } else if (event.effect === 'drone') {
              const squad = this.droneActors.get(tower.id)
              if (squad) squad.dispatch(event.droneIndex ?? 0, targetScreen, () => this.effects.playImpact(targetScreen, event.effect))
              else this.effects.playImpact(targetScreen, event.effect)
            } else if (event.effect === 'arc') {
              const origin = previousArcTarget ?? this.towerActors.get(tower.id)?.attackOrigin() ?? towerScreen
              this.effects.playArcLightning(origin, targetScreen, event.chainIndex ?? 0)
              previousArcTarget = targetScreen
            } else if (event.effect === 'hacker') {
              if (!hackerPulsePlayed) {
                const origin = this.towerActors.get(tower.id)?.attackOrigin() ?? towerScreen
                this.effects.playHackerPulse(origin, targetScreen, tower.level)
                hackerPulsePlayed = true
              } else {
                this.effects.playImpact(targetScreen, event.effect)
              }
            } else {
              const origin = event.effect === 'rail'
                ? this.towerActors.get(tower.id)?.attackOrigin() ?? towerScreen
                : towerScreen
              this.effects.playShot(origin, targetScreen, event.effect)
            }
          }
          if (target) {
            EventBus.emit(GameEvents.AchievementSignal, {
              type: 'tower-attack',
              towerType: tower.typeId,
              enemyId: target.id,
              enemyType: target.typeId,
              killed: event.result.killed,
              air: target.air,
              armored: target.armor >= 0.25,
              phaseCapable: target.phaseCapable,
              chainIndex: event.chainIndex,
              source: event.effect,
            })
          }
          if (event.result.destroyedComponent && target?.typeId === 'enforcer') {
            EventBus.emit(GameEvents.AchievementSignal, {
              type: 'boss-component',
              bossType: 'enforcer',
              component: event.result.destroyedComponent,
            })
            const voiceEvent = ENFORCER_COMPONENT_EVENT[event.result.destroyedComponent]
            if (voiceEvent) this.voice?.play('enforcer', voiceEvent, { priority: 2 })
          }
        }
      }
      if (this.selectedTowerId === tower.id) this.emitTowerInfo(tower)
    }

    tickEnemyTraits(this.geometry, this.battle.enemies, this.battle.now, dtSeconds)
    this.tickQuantumFirewalls()

    let baseDamageThisFrame = 0
    for (const enemy of this.battle.enemies) {
      if (enemy.dead || enemy.blocked || this.battle.now < enemy.stunnedUntil) continue
      const enemySpeedScale = this.activeSpecialEvent?.modifiers.enemySpeedScale ?? 1
      const skillSlowScale = this.battle.now < enemy.skillSlowUntil ? Math.max(0.2, 1 - enemy.skillSlowAmount) : 1
      enemy.distance += enemy.speed * dtSeconds * enemySpeedScale * skillSlowScale
      if (enemy.distance >= 1000) {
        enemy.dead = true
        this.battle.leaks += 1
        this.battle.health = Math.max(0, this.battle.health - 1)
        baseDamageThisFrame += 1
      }
    }
    if (baseDamageThisFrame > 0) this.playBaseDamageFeedback(baseDamageThisFrame)

    for (const enemy of this.battle.enemies) {
      if (enemy.dead) continue
      const pos = boardToScreen(enemyPosition(this.geometry, enemy))
      this.enemyActors.get(enemy.id)?.syncVisual(pos.x, pos.y, this.battle.now)
    }

    for (let i = this.battle.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.battle.enemies[i]
      if (!enemy.dead) continue
      const leaked = enemy.distance >= 1000
      if (!leaked) {
        const deathPosition = boardToScreen(enemyPosition(this.geometry, enemy))
        this.effects.playEnemyDeathRemnant(deathPosition, enemy.mechanical, enemy.isBoss)
        const bountyMultiplier = this.activeSpecialEvent?.modifiers.bountyMultiplier ?? 1
        const reward = Math.round(scaleReward(enemy.reward, this.battle.mapIndex) * bountyMultiplier)
        this.battle.coins += reward
        this.battle.kills += 1
        if (enemy.isBoss) {
          this.voice?.play(enemy.typeId as BossId, 'defeated', { priority: 3 })
          void this.music?.exitBoss()
        }
      }
      this.battle.enemies.splice(i, 1)
      this.enemyActors.get(enemy.id)?.destroy()
      this.enemyActors.delete(enemy.id)
    }

    if (this.battle.health <= 0) {
      this.onDefeat()
      return
    }

    if (this.waveActive && this.waveQueue.length === 0 && this.battle.enemies.length === 0) {
      this.waveActive = false
      this.pendingSpecialEvent = null
      this.specialEventTriggerAt = Infinity
      if (this.activeSpecialEvent) this.endSpecialEvent()
      const clearedWave = this.battle.wave
      const reward = scaleReward(45 + clearedWave * 10, this.battle.mapIndex)
      this.battle.coins += reward
      this.campaign.addResearchPoints(1)
      this.battle.wave += 1
      this.persistProgress()
      if (this.battle.wave > this.totalWaves) {
        this.onVictory(reward)
      } else {
        this.nextWaveCountdown = COUNTDOWN_SECONDS
        EventBus.emit(GameEvents.WaveCleared, { nextWave: this.battle.wave, reward, researchPoints: this.campaign.researchPoints })
      }
    }

    if (!this.waveActive && !this.ended && this.nextWaveCountdown > 0) {
      this.nextWaveCountdown = Math.max(0, this.nextWaveCountdown - dtSeconds)
      if (this.nextWaveCountdown <= 0) {
        this.startWave()
      }
    }

    this.hudTimer += deltaMs
    if (this.hudTimer > 120) {
      this.hudTimer = 0
      this.emitHud()
    }
  }

  private activateSpecialEvent(event: SpecialEventDefinition) {
    this.pendingSpecialEvent = null
    this.specialEventTriggerAt = Infinity
    this.usedSpecialEventIds.add(event.id)
    this.specialEventsTriggered += 1

    const coinGrant = event.modifiers.coins ?? 0
    if (coinGrant > 0) {
      this.battle.coins += coinGrant
      this.emitHud()
    }

    if (event.durationSeconds > 0) {
      this.activeSpecialEvent = event
      this.specialEventEndsAt = this.battle.now + event.durationSeconds * 1000
    } else {
      this.activeSpecialEvent = null
      this.specialEventEndsAt = Infinity
    }

    EventBus.emit(GameEvents.SpecialEventStarted, {
      id: event.id,
      tone: event.tone,
      title: event.title,
      source: event.source,
      description: event.description,
      effectLabel: event.effectLabel,
      durationSeconds: event.durationSeconds,
    })
  }

  private endSpecialEvent() {
    const event = this.activeSpecialEvent
    if (!event) return
    this.activeSpecialEvent = null
    this.specialEventEndsAt = Infinity
    EventBus.emit(GameEvents.SpecialEventEnded, { id: event.id, title: event.title })
  }

  private syncMercenaryActor(tower: TowerState) {
    if (tower.typeId !== 'street-mercenary' || !tower.mercs || !tower.rallyPoint) return
    let actor = this.mercActors.get(tower.id)
    if (!actor) {
      actor = new MercenaryActor(this, tower.mercs.length).setDepth(25)
      this.mercActors.set(tower.id, actor)
    }
    const screen = boardToScreen(tower.rallyPoint)
    actor.sync(screen.x, screen.y, tower.mercs.map((m) => Boolean(m.respawnAt)), (at) => {
      this.effects.playMercenaryDeath(at)
      this.voice?.play('street-mercenary', 'down', { chance: 0.45 })
    })
  }

  private syncDroneActor(tower: TowerState) {
    if (tower.typeId !== 'drone-hive') return
    let actor = this.droneActors.get(tower.id)
    if (!actor) {
      actor = new DroneSquadActor(this, TOWER_COMBAT['drone-hive'].drones).setDepth(25)
      this.droneActors.set(tower.id, actor)
    }
    const screen = boardToScreen(tower.source)
    actor.sync(screen.x, screen.y, this.battle.now)
  }

  private persistProgress() {
    const savedTowers: SavedTower[] = this.battle.towers.map((t) => ({
      slot: t.slotIndex,
      type: t.typeId,
      level: t.level,
      spent: t.spent,
      rallyX: t.rallyPoint?.x ?? null,
      rallyY: t.rallyPoint?.y ?? null,
    }))
    this.campaign.coins = this.battle.coins
    this.campaign.health = this.battle.health
    this.campaign.wave = this.battle.wave
    this.campaign.savedTowers = savedTowers
    this.campaign.persist({ towers: savedTowers, wave: this.battle.wave })
  }

  private emitHud() {
    const payload: BattleHudPayload = {
      coins: this.battle.coins,
      health: this.battle.health,
      wave: Math.min(this.battle.wave, this.totalWaves),
      totalWaves: this.totalWaves,
      maxHealth: 10,
      speed: this.campaign.gameSpeed,
      waveActive: this.waveActive,
      countdown: Math.ceil(this.nextWaveCountdown),
      deployedCount: this.battle.towers.length,
      maxSlots: this.mapLevel.slots.length,
      enemyCount: this.battle.enemies.length,
      mapIndex: this.battle.mapIndex,
      difficulty: this.battle.difficulty,
      towers: this.battle.towers.map((t) => ({ slotIndex: t.slotIndex, typeId: t.typeId, level: t.level })),
      skills: PLAYER_SKILLS.map(({ id }) => {
        const level = this.campaign.playerSkillLevel(id)
        const cooldown = level > 0 ? playerSkillCooldown(id, level) : 0
        const remaining = this.skillCooldowns[id]
        return { id, level, cooldown, remaining, ready: level > 0 && remaining <= 0 && this.waveActive }
      }),
    }
    EventBus.emit(GameEvents.HudUpdate, payload)
  }

  private playBaseDamageFeedback(damage: number) {
    const intensity = Math.min(0.018, 0.006 + Math.max(0, damage - 1) * 0.0025)
    this.cameras.main.shake(220, intensity, true)

    // 同一瞬间多个敌人突破时只播放一次，避免音效叠加爆音。
    const now = this.time.now
    if (now - this.lastBaseDamageSfxAt >= 240 && this.cache.audio.exists('sfx-base-damage')) {
      this.sound.play('sfx-base-damage', { volume: 0.9 })
      this.lastBaseDamageSfxAt = now
    }
    if (now - this.lastBaseDamageVoiceAt >= BASE_DAMAGE_VOICE_INTERVAL_MS) {
      const played = this.voice?.play('lan', 'damage', { priority: 3, bypassGlobalCooldown: true })
      if (played) this.lastBaseDamageVoiceAt = now
    }
  }

  private onVictory(reward = 0) {
    this.ended = true
    this.persistProgress()
    this.voice?.play('lan', 'victory', { priority: 5 })
    const result = this.campaign.demoActive
      ? { unlocked: this.campaign.unlockedMapIndex, newlyUnlocked: false }
      : this.campaign.completeMission(this.battle.mapIndex)
    EventBus.emit(GameEvents.AchievementSignal, {
      type: 'mission-victory',
      mapIndex: this.battle.mapIndex,
      difficulty: this.battle.difficulty,
      health: this.battle.health,
      maxHealth: MAX_HEALTH,
    })
    EventBus.emit(GameEvents.Victory, { unlockedMapIndex: result.unlocked, newlyUnlocked: result.newlyUnlocked, reward, demoActive: this.campaign.demoActive })
  }

  private onDefeat() {
    this.ended = true
    this.persistProgress()
    this.voice?.play('lan', 'defeat', { priority: 5 })
    EventBus.emit(GameEvents.GameOver, {})
  }
}
