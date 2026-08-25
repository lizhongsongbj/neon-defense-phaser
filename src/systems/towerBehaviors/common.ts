import { TOWER_COMBAT } from '../../data/towers'
import { EXPANSION_TOWER_BY_ID, isExpansionTowerId, type AllTowerId } from '../../data/towerExpansion'
import { enemyPosition } from '../CombatSystem'
import { projectedDistance } from '../PathSystem'
import type { EnemyState, TowerState } from '../types'
import type { TowerAttackContext } from './types'

/** 塔楼当前实际射程,原 `_0x1b0355` */
export function effectiveRange(tower: TowerState, typeId: AllTowerId, growthRange: number): number {
  const baseRange = isExpansionTowerId(typeId)
    ? EXPANSION_TOWER_BY_ID[typeId].levels[tower.level - 1].range
    : (TOWER_COMBAT[typeId] as { ranges: [number, number, number] }).ranges[tower.level - 1]
  return baseRange * growthRange * tower.rangeScale
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
