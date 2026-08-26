import { TOWER_COMBAT } from '../../data/towers'
import { EXPANSION_TOWER_BY_ID, TIER4_BRANCH_BY_ID, isExpansionTowerId, type AllTowerId, type Tier4BranchDefinition } from '../../data/towerExpansion'
import { enemyPosition } from '../CombatSystem'
import { projectedDistance } from '../PathSystem'
import type { EnemyState, TowerState } from '../types'
import type { TowerAttackContext } from './types'

export function activeTier4Branch(tower: TowerState): Tier4BranchDefinition | null {
  if (tower.level !== 4 || !tower.tier4BranchId) return null
  const branch = TIER4_BRANCH_BY_ID[tower.tier4BranchId]
  return branch?.towerId === tower.typeId ? branch : null
}

/** 塔楼当前实际射程,原 `_0x1b0355` */
export function effectiveRange(tower: TowerState, typeId: AllTowerId, growthRange: number): number {
  const branch = activeTier4Branch(tower)
  const baseRange = branch ? branch.stats.range : isExpansionTowerId(typeId)
    ? EXPANSION_TOWER_BY_ID[typeId].levels[Math.min(2, tower.level - 1)].range
    : (TOWER_COMBAT[typeId] as { ranges: [number, number, number] }).ranges[Math.min(2, tower.level - 1)]
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
