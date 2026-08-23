import { TOWER_COMBAT, type TowerId } from '../../data/towers'
import { enemyPosition } from '../CombatSystem'
import { projectedDistance } from '../PathSystem'
import type { EnemyState, TowerState } from '../types'
import type { TowerAttackContext } from './types'

/** 塔楼当前实际射程,原 `_0x1b0355` */
export function effectiveRange<T extends TowerId>(tower: TowerState, typeId: T, growthRange: number): number {
  const combat = TOWER_COMBAT[typeId] as { ranges: [number, number, number] }
  return combat.ranges[tower.level - 1] * growthRange * tower.rangeScale
}

/** 塔楼实际伤害(叠加研发强化),原 `_0xac2a0f` */
export function effectiveDamage(rawDamage: number, growthDamage: number): number {
  return rawDamage * growthDamage
}

export function enemiesInTowerRange(ctx: TowerAttackContext, tower: TowerState, range: number, includeAir = true): EnemyState[] {
  return ctx.enemies.filter((e) => {
    if (e.dead) return false
    if (!includeAir && e.air) return false
    return projectedDistance(tower.source, enemyPosition(ctx.geometry, e)) <= range
  })
}

export function distanceToEnemy(ctx: TowerAttackContext, tower: TowerState, enemy: EnemyState): number {
  return projectedDistance(tower.source, enemyPosition(ctx.geometry, enemy))
}
