import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, type AchievementDefinition } from '../data/achievements'
import { EventBus, GameEvents } from '../state/EventBus'

const STORAGE_KEY = 'neon-defense-achievements-v2'
const TOWER_IDS = new Set(['mag-rail-sniper', 'arc-neon', 'street-mercenary', 'hacker-relay', 'drone-hive'])
const ENEMY_IDS = new Set(['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker', 'neurohound', 'matriarch', 'bonebreaker'])

type Difficulty = 'easy' | 'normal' | 'hard'

export type AchievementSignal =
  | { type: 'mission-start'; mapIndex: number; difficulty: Difficulty; demoActive?: boolean }
  | { type: 'tower-built'; towerType: string }
  | { type: 'tower-attack'; towerType: string; enemyId: number; enemyType: string; killed: boolean; air?: boolean; armored?: boolean; phaseCapable?: boolean; chainIndex?: number; source?: string }
  | { type: 'boss-component'; bossType: string; component: string }
  | { type: 'mission-victory'; mapIndex: number; difficulty: Difficulty; health: number; maxHealth: number }

interface AchievementSave {
  version: 2
  unlockedAt: Record<string, string>
  progress: Record<string, number>
  enemyKinds: string[]
  towerTypes: string[]
  completedMaps: number[]
  perfectMaps: number[]
  hardMaps: number[]
}

export interface AchievementViewState {
  unlockedAt: Record<string, string>
  progress: Record<string, number>
  enemyKinds: string[]
  towerTypes: string[]
  completedMaps: number[]
  perfectMaps: number[]
  hardMaps: number[]
}

function emptySave(): AchievementSave {
  return { version: 2, unlockedAt: {}, progress: {}, enemyKinds: [], towerTypes: [], completedMaps: [], perfectMaps: [], hardMaps: [] }
}

function loadSave(): AchievementSave {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<AchievementSave> | null
    if (!parsed || parsed.version !== 2) return emptySave()
    return {
      version: 2,
      unlockedAt: parsed.unlockedAt && typeof parsed.unlockedAt === 'object' ? parsed.unlockedAt : {},
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
      enemyKinds: Array.isArray(parsed.enemyKinds) ? parsed.enemyKinds.filter((id) => ENEMY_IDS.has(id)) : [],
      towerTypes: Array.isArray(parsed.towerTypes) ? parsed.towerTypes.filter((id) => TOWER_IDS.has(id)) : [],
      completedMaps: Array.isArray(parsed.completedMaps) ? parsed.completedMaps.filter((index) => Number.isInteger(index) && index >= 0 && index < 8) : [],
      perfectMaps: Array.isArray(parsed.perfectMaps) ? parsed.perfectMaps.filter((index) => Number.isInteger(index) && index >= 0 && index < 8) : [],
      hardMaps: Array.isArray(parsed.hardMaps) ? parsed.hardMaps.filter((index) => Number.isInteger(index) && index >= 0 && index < 8) : [],
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
  private missionBossComponents = new Set<string>()

  constructor() {
    EventBus.on(GameEvents.AchievementSignal, this.onSignal, this)
    this.checkAll()
  }

  destroy() {
    EventBus.off(GameEvents.AchievementSignal, this.onSignal, this)
  }

  definitions(): readonly AchievementDefinition[] { return ACHIEVEMENTS }

  state(): AchievementViewState {
    return {
      unlockedAt: { ...this.save.unlockedAt },
      progress: { ...this.save.progress },
      enemyKinds: [...this.save.enemyKinds],
      towerTypes: [...this.save.towerTypes],
      completedMaps: [...this.save.completedMaps],
      perfectMaps: [...this.save.perfectMaps],
      hardMaps: [...this.save.hardMaps],
    }
  }

  isUnlocked(id: string) { return Boolean(this.save.unlockedAt[id]) }

  progressFor(definition: AchievementDefinition): number {
    switch (definition.progressKey) {
      case 'enemyKinds': return this.save.enemyKinds.length
      case 'towerTypes': return this.save.towerTypes.length
      case 'completedMaps': return this.save.completedMaps.length
      case 'perfectMaps': return this.save.perfectMaps.length
      case 'hardMaps': return this.save.hardMaps.length
      case 'missionActiveTowerTypes': return [...this.missionBuilt].filter((id) => this.missionAttacked.has(id)).length
      case 'missionBossComponents': return this.missionBossComponents.size
      default: return definition.progressKey ? (this.save.progress[definition.progressKey] ?? 0) : 0
    }
  }

  private onSignal = (signal: AchievementSignal) => {
    if (!signal || typeof signal !== 'object' || !('type' in signal)) return
    if (signal.type === 'mission-start') { this.startMission(signal); return }
    if (this.demoActive) return

    switch (signal.type) {
      case 'tower-built':
        if (!TOWER_IDS.has(signal.towerType)) return
        this.missionBuilt.add(signal.towerType)
        if (!this.save.towerTypes.includes(signal.towerType)) this.save.towerTypes.push(signal.towerType)
        this.add('builds', 1)
        this.checkAll()
        break
      case 'tower-attack':
        this.handleAttack(signal)
        break
      case 'boss-component':
        if (signal.bossType === 'enforcer') {
          this.missionBossComponents.add(signal.component)
          this.checkAll()
        }
        break
      case 'mission-victory':
        this.handleVictory(signal)
        break
    }
  }

  private startMission(signal: Extract<AchievementSignal, { type: 'mission-start' }>) {
    this.missionMapIndex = signal.mapIndex
    this.demoActive = Boolean(signal.demoActive)
    this.missionBuilt.clear()
    this.missionAttacked.clear()
    this.missionBossComponents.clear()
    this.emitChanged()
  }

  private handleAttack(signal: Extract<AchievementSignal, { type: 'tower-attack' }>) {
    if (!TOWER_IDS.has(signal.towerType)) return
    this.missionAttacked.add(signal.towerType)
    this.add('attacks', 1)
    // 连锁跳跃和相位显形是“攻击效果”，不要求该次攻击正好完成击杀。
    if (signal.towerType === 'arc-neon' && (signal.chainIndex ?? 0) > 0) this.add('arcChainJumps', 1)
    if (signal.towerType === 'hacker-relay' && signal.phaseCapable) this.add('hackerReveals', 1)
    if (signal.killed) {
      this.add('kills', 1)
      if (ENEMY_IDS.has(signal.enemyType) && !this.save.enemyKinds.includes(signal.enemyType)) this.save.enemyKinds.push(signal.enemyType)
      if (signal.towerType === 'mag-rail-sniper' && (signal.armored || signal.air)) this.add('railHeavyKills', 1)
      if (signal.towerType === 'drone-hive' && signal.air) this.add('droneAirKills', 1)
    }
    this.checkAll()
  }

  private handleVictory(signal: Extract<AchievementSignal, { type: 'mission-victory' }>) {
    if (!this.save.completedMaps.includes(signal.mapIndex)) this.save.completedMaps.push(signal.mapIndex)
    if (signal.health >= signal.maxHealth && !this.save.perfectMaps.includes(signal.mapIndex)) this.save.perfectMaps.push(signal.mapIndex)
    if (signal.difficulty === 'hard' && !this.save.hardMaps.includes(signal.mapIndex)) this.save.hardMaps.push(signal.mapIndex)
    this.checkAll()
  }

  private checkAll() {
    for (let index = 0; index < 8; index += 1) {
      if (this.save.completedMaps.includes(index)) this.unlock(`campaign-map-${String(index + 1).padStart(2, '0')}`)
    }
    if ((this.save.progress.attacks ?? 0) >= 1) this.unlock('tower-first-shot')
    if ((this.save.progress.kills ?? 0) >= 100) this.unlock('tower-hundred-kills')
    if (this.save.towerTypes.length >= 5) this.unlock('tower-five-types')
    if ((this.save.progress.arcChainJumps ?? 0) >= 25) this.unlock('tower-arc-chain')
    if ((this.save.progress.hackerReveals ?? 0) >= 10) this.unlock('tower-hacker-reveal')
    if ((this.save.progress.railHeavyKills ?? 0) >= 20) this.unlock('tower-rail-heavy')
    if ((this.save.progress.droneAirKills ?? 0) >= 20) this.unlock('tower-drone-air')
    if (this.missionBossComponents.size >= 3) this.unlock('tower-boss-breaker')
    if (this.save.enemyKinds.length >= 10) this.unlock('challenge-all-hostiles')
    if ([...this.missionBuilt].filter((id) => this.missionAttacked.has(id)).length >= 5) this.unlock('challenge-five-towers')
    if (this.save.perfectMaps.length >= 3) this.unlock('challenge-perfect-grid')
    if (this.save.hardMaps.length >= 3) this.unlock('challenge-night-city-legend')
    if (this.save.completedMaps.includes(5) && this.missionBossComponents.size >= 3) this.unlock('hidden-enforcer')
    if (this.save.completedMaps.includes(7)) this.unlock('hidden-arsaka')
    this.persistAndEmit()
  }

  private add(key: string, amount: number) {
    this.save.progress[key] = (this.save.progress[key] ?? 0) + Math.max(0, amount)
  }

  private unlock(id: string) {
    const definition = ACHIEVEMENT_BY_ID[id]
    if (!definition || this.save.unlockedAt[id]) return
    this.save.unlockedAt[id] = new Date().toISOString()
    EventBus.emit(GameEvents.AchievementUnlocked, { definition, unlockedAt: this.save.unlockedAt[id] })
  }

  private persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.save)) } catch { /* ignore storage failures */ }
  }

  private persistAndEmit() {
    this.persist()
    this.emitChanged()
  }

  private emitChanged() { EventBus.emit(GameEvents.AchievementStateChanged, this.state()) }
}
