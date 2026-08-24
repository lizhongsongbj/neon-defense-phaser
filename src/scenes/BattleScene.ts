import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig'
import { MAP_LEVELS, CAMPAIGN_WAVE_COUNTS, CAMPAIGN_STARTING_COINS, type MapLevel, type Point2 } from '../data/maps'
import { TOWER_COMBAT, TOWER_TYPE_BY_ID, type TowerId } from '../data/towers'
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
import { BOSS_TYPES, type BossId } from '../data/bosses'
import type { SavedTower } from '../systems/SaveGame'
import { MUSIC_REGISTRY_KEY, VOICE_REGISTRY_KEY, type MusicController, type VoiceCategory, type VoiceSystem } from '../audio'

function boardToScreen(p: Point2): Point2 {
  return { x: (p.x / 1000) * GAME_WIDTH, y: (p.y / 1000) * GAME_HEIGHT }
}

/** 敌人/塔图片基准尺寸,原版用 vw 百分比表示,这里按画布宽度换算 */
function spriteSize(scale: number): number {
  return Math.max(28, scale * GAME_WIDTH)
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
  private slotMarkers: Phaser.GameObjects.Arc[] = []
  private effects!: EffectsLayer

  private selectedTowerId: string | null = null
  private waveActive = false
  private waveElapsed = 0
  private waveQueue: Array<WaveRosterEntry & { spawnAt: number }> = []
  private ended = false
  private hudTimer = 0
  private voice!: VoiceSystem
  private music!: MusicController
  private lastBaseDamageSfxAt = -Infinity
  /** 下一波整备倒计时(秒),原 `_0x3ebe3b`;0 表示战斗中或需要玩家手动发动 */
  private nextWaveCountdown = 0

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

    this.campaign = this.game.registry.get(REGISTRY_KEY) as CampaignState
    this.voice = this.game.registry.get(VOICE_REGISTRY_KEY) as VoiceSystem
    this.music = this.game.registry.get(MUSIC_REGISTRY_KEY) as MusicController
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
    const g = this.add.graphics()
    g.lineStyle(3, 0x2ee8ff, 0.25)
    for (const lane of ['left', 'right'] as const) {
      const segs = this.geometry[lane].segments
      if (!segs.length) continue
      const start = boardToScreen(segs[0].from)
      g.beginPath()
      g.moveTo(start.x, start.y)
      for (const seg of segs) {
        const p = boardToScreen(seg.to)
        g.lineTo(p.x, p.y)
      }
      g.strokePath()
    }
  }

  private drawSlots() {
    this.mapLevel.slots.forEach((slot, index) => {
      const screen = boardToScreen(toBoardUnits(slot))
      const marker = this.add
        .circle(screen.x, screen.y, 14, 0x20f4e6, 0.18)
        .setStrokeStyle(1, 0x79ffe8, 0.6)
        .setInteractive({ useHandCursor: true })
      marker.on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
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
  }

  private teardown() {
    EventBus.off(GameEvents.BuildTower, this.onBuildTowerRequest, this)
    EventBus.off(GameEvents.UpgradeTower, this.onUpgradeRequest, this)
    EventBus.off(GameEvents.SellTower, this.onSellRequest, this)
    EventBus.off(GameEvents.SetSpeed, this.onSetSpeed, this)
    EventBus.off(GameEvents.ReturnToCommandCenter, this.onReturnToCommandCenter, this)
    EventBus.off(GameEvents.StartNextWave, this.onStartWaveRequest, this)
    EventBus.off(GameEvents.ResetDeployment, this.onResetDeployment, this)
    EventBus.off(GameEvents.RestartBattle, this.onRestartBattleRequest, this)
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

  private onBuildTowerRequest(payload: { slotIndex: number; typeId: TowerId }) {
    const { slotIndex, typeId } = payload
    if (this.battle.towers.some((t) => t.slotIndex === slotIndex)) return
    const cost = TOWER_TYPE_BY_ID[typeId].cost
    if (this.battle.coins < cost) return
    this.battle.coins -= cost
    this.instantiateTower(slotIndex, typeId, { level: 1, spent: cost, rallyPoint: null })
    this.voice?.play(typeId, 'build')
    this.persistProgress()
    this.emitHud()
    EventBus.emit(GameEvents.ClearSelection)
  }

  private instantiateTower(
    slotIndex: number,
    typeId: TowerId,
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
    const baseSize = spriteSize(slot.scale)
    const actor = new TowerActor(this, tower, baseSize)
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
    this.voice?.play(tower.typeId, 'select', { chance: 0.4 })
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
    const def = TOWER_TYPE_BY_ID[tower.typeId]
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
    this.voice?.play(tower.typeId, 'upgrade')
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
    this.voice?.play(tower.typeId, 'dismantle')
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
    const baseSize = spriteSize(def?.size ?? 0.045)
    const actor = new EnemyActor(this, enemy, baseSize)
    this.enemyActors.set(enemy.id, actor)

    if (enemy.isBoss) {
      const bossId = enemy.typeId as BossId
      this.voice?.play(bossId, 'entrance', { priority: 3 })
      void this.music?.enterBoss(bossId)
    } else {
      this.voice?.play(enemy.typeId as VoiceCategory, 'spawn', { chance: 0.3 })
    }
  }

  update(_time: number, deltaMs: number) {
    if (this.ended) return
    const speed = this.campaign.gameSpeed || 1
    const dt = Math.min(deltaMs, 50) * speed
    const dtSeconds = dt / 1000
    this.battle.now += dt

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
      const events = resolveTowerAttack(tower, {
        geometry: this.geometry,
        enemies: this.battle.enemies.filter((e) => !e.dead),
        dt: dtSeconds,
        now: this.battle.now,
        growth,
      })
      this.syncMercenaryActor(tower)
      this.syncDroneActor(tower)
      if (events.length) {
        const towerScreen = boardToScreen(tower.source)
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
            } else {
              this.effects.playShot(towerScreen, targetScreen, event.effect)
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

    let baseDamageThisFrame = 0
    for (const enemy of this.battle.enemies) {
      if (enemy.dead || enemy.blocked) continue
      enemy.distance += enemy.speed * dtSeconds
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
      this.enemyActors.get(enemy.id)?.syncVisual(pos.x, pos.y)
    }

    for (let i = this.battle.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.battle.enemies[i]
      if (!enemy.dead) continue
      const leaked = enemy.distance >= 1000
      if (!leaked) {
        const reward = scaleReward(enemy.reward, this.battle.mapIndex)
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

  private syncMercenaryActor(tower: TowerState) {
    if (tower.typeId !== 'street-mercenary' || !tower.mercs || !tower.rallyPoint) return
    let actor = this.mercActors.get(tower.id)
    if (!actor) {
      actor = new MercenaryActor(this, tower.mercs.length)
      this.mercActors.set(tower.id, actor)
    }
    const screen = boardToScreen(tower.rallyPoint)
    actor.sync(screen.x, screen.y, tower.mercs.map((m) => Boolean(m.respawnAt)))
  }

  private syncDroneActor(tower: TowerState) {
    if (tower.typeId !== 'drone-hive') return
    let actor = this.droneActors.get(tower.id)
    if (!actor) {
      actor = new DroneSquadActor(this, TOWER_COMBAT['drone-hive'].drones)
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
    this.voice?.play('lan', 'damage', { chance: 0.6, priority: 3 })
  }

  private onVictory(reward = 0) {
    this.ended = true
    this.persistProgress()
    this.voice?.play('lan', 'victory', { priority: 5 })
    const result = this.campaign.completeMission(this.battle.mapIndex)
    EventBus.emit(GameEvents.AchievementSignal, {
      type: 'mission-victory',
      mapIndex: this.battle.mapIndex,
      difficulty: this.battle.difficulty,
      health: this.battle.health,
      maxHealth: MAX_HEALTH,
    })
    EventBus.emit(GameEvents.Victory, { unlockedMapIndex: result.unlocked, newlyUnlocked: result.newlyUnlocked, reward })
  }

  private onDefeat() {
    this.ended = true
    this.persistProgress()
    this.voice?.play('lan', 'defeat', { priority: 5 })
    EventBus.emit(GameEvents.GameOver, {})
  }
}
