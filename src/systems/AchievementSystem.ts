import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, type AchievementDefinition } from '../data/achievements'
import { EventBus, GameEvents } from '../state/EventBus'

const STORAGE_KEY = 'neon-defense-achievements-v1'
const ALL_TOWER_IDS = new Set([
  'mag-rail-sniper', 'arc-neon', 'street-mercenary', 'hacker-relay',
  'drone-hive', 'gravity-nail', 'grey-tide', 'trajectory-rewriter',
])
const ALL_ENEMY_IDS = new Set([
  'gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday',
  'hijacker', 'neurohound', 'matriarch', 'bonebreaker', 'enforcer', 'eve',
])

type Difficulty = 'easy' | 'normal' | 'hard'

export type AchievementSignal =
  | { type: 'mission-start'; mapIndex: number; difficulty: Difficulty; demoActive?: boolean }
  | { type: 'tower-built'; towerType: string }
  | { type: 'tower-attack'; towerType: string; enemyId: number; enemyType: string; killed: boolean; air?: boolean; armored?: boolean; phaseCapable?: boolean; chainIndex?: number; source?: string }
  | { type: 'boss-component'; bossType: string; component: string }
  | { type: 'mission-victory'; mapIndex: number; difficulty: Difficulty; health: number; maxHealth: number }
  | { type: 'facility-stat'; key: string; amount?: number; enemyId?: number }
  | { type: 'mercenary-block'; seconds: number }
  | { type: 'gravity-hit'; targets: number }
  | { type: 'grey-shred-kill'; amount?: number }
  | { type: 'rewrite-distance'; distance: number; enemyId?: number; shrineAffected?: boolean; repeatedCheckpointPasses?: number }

interface AchievementSave {
  version: 1
  unlockedAt: Record<string, string>
  progress: Record<string, number>
  enemyKinds: string[]
  perfectMaps: number[]
  hardMaps: number[]
}

export interface AchievementViewState {
  unlockedAt: Record<string, string>
  progress: Record<string, number>
  enemyKinds: string[]
  perfectMaps: number[]
  hardMaps: number[]
}

function emptySave(): AchievementSave {
  return { version: 1, unlockedAt: {}, progress: {}, enemyKinds: [], perfectMaps: [], hardMaps: [] }
}

function loadSave(): AchievementSave {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<AchievementSave> | null
    if (!parsed || parsed.version !== 1) return emptySave()
    return {
      version: 1,
      unlockedAt: parsed.unlockedAt && typeof parsed.unlockedAt === 'object' ? parsed.unlockedAt : {},
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
      enemyKinds: Array.isArray(parsed.enemyKinds) ? parsed.enemyKinds.filter((id) => ALL_ENEMY_IDS.has(id)) : [],
      perfectMaps: Array.isArray(parsed.perfectMaps) ? parsed.perfectMaps.filter(Number.isInteger) : [],
      hardMaps: Array.isArray(parsed.hardMaps) ? parsed.hardMaps.filter(Number.isInteger) : [],
    }
  } catch {
    return emptySave()
  }
}

export class AchievementSystem {
  private save = loadSave()
  private missionMapIndex = 0
  private demoActive = false
  private missionBuilt = new Set<string>()
  private missionAttacked = new Set<string>()
  private missionHackerTargets = new Set<number>()
  private missionBossComponents = new Set<string>()
  private missionStats: Record<string, number> = {}

  constructor() {
    EventBus.on(GameEvents.AchievementSignal, this.onSignal, this)
    this.checkCollectionAchievements(false)
  }

  destroy() {
    EventBus.off(GameEvents.AchievementSignal, this.onSignal, this)
  }

  definitions(): readonly AchievementDefinition[] {
    return ACHIEVEMENTS
  }

  state(): AchievementViewState {
    return {
      unlockedAt: { ...this.save.unlockedAt },
      progress: { ...this.save.progress },
      enemyKinds: [...this.save.enemyKinds],
      perfectMaps: [...this.save.perfectMaps],
      hardMaps: [...this.save.hardMaps],
    }
  }

  isUnlocked(id: string) {
    return Boolean(this.save.unlockedAt[id])
  }

  progressFor(definition: AchievementDefinition): number {
    switch (definition.progressKey) {
      case 'enemyKinds': return this.save.enemyKinds.length
      case 'perfectMaps': return this.save.perfectMaps.length
      case 'hardMaps': return this.save.hardMaps.length
      case 'missionActiveTowerTypes': return [...this.missionBuilt].filter((id) => this.missionAttacked.has(id)).length
      case 'missionMercenaryBlockSeconds': return this.missionStats.missionMercenaryBlockSeconds ?? 0
      default: return definition.progressKey ? (this.save.progress[definition.progressKey] ?? this.missionStats[definition.progressKey] ?? 0) : 0
    }
  }

  private onSignal(signal: AchievementSignal) {
    if (!signal || typeof signal !== 'object' || !('type' in signal)) return
    if (signal.type === 'mission-start') {
      this.startMission(signal)
      return
    }
    if (this.demoActive) return

    switch (signal.type) {
      case 'tower-built':
        this.missionBuilt.add(signal.towerType)
        this.emitChanged()
        break
      case 'tower-attack':
        this.handleTowerAttack(signal)
        break
      case 'boss-component':
        if (signal.bossType === 'enforcer') this.missionBossComponents.add(signal.component)
        break
      case 'mission-victory':
        this.handleVictory(signal)
        break
      case 'facility-stat':
        this.addMissionStat(signal.key, signal.amount ?? 1)
        break
      case 'mercenary-block':
        this.addMissionStat('missionMercenaryBlockSeconds', Math.max(0, signal.seconds))
        this.checkTarget('tower-merc-wall', this.missionStats.missionMercenaryBlockSeconds)
        break
      case 'gravity-hit':
        this.setMaxProgress('gravityMaxTargets', signal.targets)
        this.checkTarget('tower-gravity-well', signal.targets)
        break
      case 'grey-shred-kill':
        this.addProgress('greyShredKills', signal.amount ?? 1)
        this.checkTarget('tower-grey-dismantle', this.save.progress.greyShredKills)
        break
      case 'rewrite-distance':
        this.addProgress('rewriteDistance', Math.max(0, signal.distance))
        this.checkTarget('tower-rewriter-yesterday', this.save.progress.rewriteDistance)
        if (this.missionMapIndex === 6 && signal.shrineAffected && (signal.repeatedCheckpointPasses ?? 0) >= 3) {
          this.unlock('hidden-deja-vu')
        }
        break
    }
  }

  private startMission(signal: Extract<AchievementSignal, { type: 'mission-start' }>) {
    this.missionMapIndex = signal.mapIndex
    this.demoActive = Boolean(signal.demoActive)
    this.missionBuilt.clear()
    this.missionAttacked.clear()
    this.missionHackerTargets.clear()
    this.missionBossComponents.clear()
    this.missionStats = {}
    this.emitChanged()
  }

  private handleTowerAttack(signal: Extract<AchievementSignal, { type: 'tower-attack' }>) {
    if (ALL_TOWER_IDS.has(signal.towerType)) this.missionAttacked.add(signal.towerType)

    if (signal.towerType === 'arc-neon' && (signal.chainIndex ?? 0) > 0) {
      this.addProgress('arcChainJumps', 1)
      this.checkTarget('tower-arc-blackout', this.save.progress.arcChainJumps)
    }
    if (signal.towerType === 'hacker-relay' && signal.phaseCapable && !this.missionHackerTargets.has(signal.enemyId)) {
      this.missionHackerTargets.add(signal.enemyId)
      this.addProgress('hackerReveals', 1)
      this.checkTarget('tower-hacker-zero-day', this.save.progress.hackerReveals)
    }
    if (!signal.killed) {
      this.persistAndEmit()
      return
    }

    if (ALL_ENEMY_IDS.has(signal.enemyType) && !this.save.enemyKinds.includes(signal.enemyType)) {
      this.save.enemyKinds.push(signal.enemyType)
    }
    if (signal.towerType === 'mag-rail-sniper' && (signal.armored || signal.air)) {
      this.addProgress('railHeavyKills', 1)
      this.checkTarget('tower-rail-sky-piercer', this.save.progress.railHeavyKills)
    }
    if (signal.towerType === 'drone-hive' && signal.air) {
      this.addProgress('droneAirKills', 1)
      this.checkTarget('tower-drone-air-control', this.save.progress.droneAirKills)
    }
    if (signal.towerType === 'street-mercenary' && signal.enemyType === 'enforcer' && signal.source === 'mercenary') {
      this.unlock('hidden-iron-fist-smasher')
    }
    this.checkCollectionAchievements()
  }

  private handleVictory(signal: Extract<AchievementSignal, { type: 'mission-victory' }>) {
    if (signal.mapIndex === 0) this.unlock('level-01-lights-on')
    if (signal.mapIndex === 1 && (this.missionStats.h8StormReveals ?? 0) >= 10) this.unlock('level-02-above-clouds')
    if (signal.mapIndex === 2 && (this.missionStats.konpekiReroutes ?? 0) >= 15) this.unlock('level-03-front-door')
    if (signal.mapIndex === 3 && (this.missionStats.embersMarkedKills ?? 0) >= 25) this.unlock('level-04-wanted')
    if (signal.mapIndex === 4 && (this.missionStats.afterlifeBlockedEnemies ?? 0) >= 20) this.unlock('level-05-afterlife-legend')
    if (signal.mapIndex === 5 && ['盾牌', '导弹舱', '推进器'].every((part) => this.missionBossComponents.has(part))) this.unlock('level-06-enforcement-ended')
    if (signal.mapIndex === 6 && (this.missionStats.mikoshiEveRewindSlow ?? 0) > 0) this.unlock('level-07-permanent-silence')
    if (signal.mapIndex === 7) this.unlock('level-08-ghost-protocol')

    if (signal.health >= signal.maxHealth && !this.save.perfectMaps.includes(signal.mapIndex)) this.save.perfectMaps.push(signal.mapIndex)
    if (signal.difficulty === 'hard' && !this.save.hardMaps.includes(signal.mapIndex)) this.save.hardMaps.push(signal.mapIndex)

    const activeTowerTypes = [...this.missionBuilt].filter((id) => this.missionAttacked.has(id))
    if (ALL_TOWER_IDS.size === activeTowerTypes.length && activeTowerTypes.every((id) => ALL_TOWER_IDS.has(id))) {
      this.unlock('challenge-eight-towers')
    }
    this.checkCollectionAchievements()
    this.persistAndEmit()
  }

  private checkCollectionAchievements(emit = true) {
    if (this.save.enemyKinds.length >= ALL_ENEMY_IDS.size) this.unlock('challenge-all-hostiles', emit)
    if (new Set(this.save.perfectMaps).size >= 8) this.unlock('challenge-perfect-grid', emit)
    if (new Set(this.save.hardMaps).size >= 8) this.unlock('challenge-night-city-legend', emit)
    if (emit) this.persistAndEmit()
  }

  private addMissionStat(key: string, amount: number) {
    this.missionStats[key] = (this.missionStats[key] ?? 0) + amount
    const matching = ACHIEVEMENTS.find((item) => item.progressKey === key)
    if (matching?.target) this.checkTarget(matching.id, this.missionStats[key])
    this.emitChanged()
  }

  private addProgress(key: string, amount: number) {
    this.save.progress[key] = (this.save.progress[key] ?? 0) + amount
  }

  private setMaxProgress(key: string, value: number) {
    this.save.progress[key] = Math.max(this.save.progress[key] ?? 0, value)
  }

  private checkTarget(id: string, value: number) {
    const def = ACHIEVEMENT_BY_ID[id]
    if (def?.target != null && value >= def.target) this.unlock(id)
    else this.persistAndEmit()
  }

  private unlock(id: string, emit = true) {
    const definition = ACHIEVEMENT_BY_ID[id]
    if (!definition || this.save.unlockedAt[id]) return false
    this.save.unlockedAt[id] = new Date().toISOString()
    this.persist()
    if (emit) EventBus.emit(GameEvents.AchievementUnlocked, { definition, unlockedAt: this.save.unlockedAt[id] })
    this.emitChanged()
    return true
  }

  private persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.save)) } catch { /* ignore storage failures */ }
  }

  private persistAndEmit() {
    this.persist()
    this.emitChanged()
  }

  private emitChanged() {
    EventBus.emit(GameEvents.AchievementStateChanged, this.state())
  }
}
