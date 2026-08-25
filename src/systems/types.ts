import type { Lane } from '../data/maps'
import type { EnemyId } from '../data/enemies'
import type { BossId } from '../data/bosses'
import type { AllTowerId } from '../data/towerExpansion'
import type { Difficulty } from '../data/balance'
import type { MapGeometry } from './PathSystem'

export type EnemyTypeId = EnemyId | BossId

export interface EnemyComponentState {
  name: string
  hp: number
  maxHp: number
}

/** 战场中的一个敌人实例的运行时状态,字段对应原 gameplay.js `_0x279dc1` */
export interface EnemyState {
  id: number
  typeId: EnemyTypeId
  isBoss: boolean
  lane: Lane
  /** 0-based entrance route index; lane remains for legacy tower logic. */
  routeIndex?: number
  distance: number
  hp: number
  maxHp: number
  shield: number
  maxShield: number
  armor: number
  speed: number
  baseSpeed: number
  attack: number
  reward: number
  elite: boolean
  air: boolean
  mechanical: boolean
  network: boolean
  phaseCapable: boolean
  energyResistance: number
  railVulnerability: number
  droneEvasion: number
  enrageThreshold: number
  enrageSpeedBonus: number
  healingAura: number
  healingRadius: number
  spawnTime: number
  lastHit: number
  revealedUntil: number
  slowUntil: number
  slowAmount: number
  stunnedUntil: number
  skillSlowUntil: number
  skillSlowAmount: number
  attackSuppressedUntil: number
  attackSuppression: number
  vulnerableUntil: number
  vulnerability: number
  shieldBlockedUntil: number
  phased: boolean
  blocked: boolean
  dead: boolean
  lastTeleport: number
  stage: number
  enragedVoicePlayed?: boolean
  coreVoicePlayed?: boolean
  components: EnemyComponentState[]
}

export interface MercenaryState {
  hp: number
  cooldown: number
  respawnAt: number
  targetId: number | null
}

/** 战场中的一座塔的运行时状态,字段对应原 gameplay.js 中 tower 元素上的 dataset + `_combat` */
export interface TowerState {
  id: string
  typeId: AllTowerId
  slotIndex: number
  source: { x: number; y: number }
  rangeScale: number
  level: 1 | 2 | 3
  spent: number
  cooldown: number
  targetId: number | null
  rallyPoint: { x: number; y: number } | null
  mercs: MercenaryState[] | null
  damageDealt: number
  utility: number
  attacks: number
}

export interface WaveRosterEntry {
  type: EnemyTypeId
  boss: boolean
  elite?: boolean
  power?: number
  speed?: number
  attack?: number
  reward?: number
  lane: Lane
  routeIndex?: number
  delay: number
}

/** 一局战斗的完整运行时状态,对应原 gameplay.js 里散落的模块级变量 */
export interface BattleState {
  mapIndex: number
  difficulty: Difficulty
  geometry: MapGeometry
  wave: number
  coins: number
  health: number
  kills: number
  leaks: number
  towers: TowerState[]
  enemies: EnemyState[]
  enemySequence: number
  now: number
}
