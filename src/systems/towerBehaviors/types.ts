import type { MapGeometry } from '../PathSystem'
import type { DamageKind, DamageResult } from '../CombatSystem'
import type { EnemyState, TowerState } from '../types'

export interface TowerAttackContext {
  geometry: MapGeometry
  enemies: EnemyState[]
  /** 帧间隔,单位秒 */
  dt: number
  /** 游戏内时钟,单位毫秒,与 EnemyState 上的各种 *Until 字段单位一致 */
  now: number
  /** 研发强化加成,来自 towerGrowthBonuses(level) */
  growth: { damage: number; range: number }
}

export interface AttackEvent {
  targetId: number
  damage: number
  kind: DamageKind
  result: DamageResult
  /** 视觉特效标签,对应原版 CSS 里的 data-kind (rail/arc/mercenary/hacker/drone) */
  effect: string
  chainIndex?: number
  droneIndex?: number
  unitIndex?: number
}
