/** 无人机蜂巢：无人机从塔内出动，在道路中心驻守并攻击经过的目标。 */

import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage, enemyPosition } from '../CombatSystem'
import { findNearestRoutePoint, projectedDistance } from '../PathSystem'
import type { EnemyState, TowerState } from '../types'
import { effectiveDamage } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

const AIR_INTERCEPT_TYPES = new Set<EnemyState['typeId']>(['hijacker', 'aerostat'])

function ensureDroneStation(tower: TowerState, ctx: TowerAttackContext) {
  if (!tower.rallyPoint) {
    const nearest = findNearestRoutePoint(ctx.geometry, tower.source)
    tower.rallyPoint = { x: nearest.x, y: nearest.y }
  }
  return tower.rallyPoint
}

/** 无人机可以攻击所有路过驻守点的敌人，但只会拦停两种浮空单位。 */
export function resolveDroneHive(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat = TOWER_COMBAT['drone-hive']
  const station = ensureDroneStation(tower, ctx)
  const patrolRadius = combat.patrolRadii[tower.level - 1] * ctx.growth.range * tower.rangeScale

  const nearby = ctx.enemies.filter((enemy) => {
    if (enemy.dead) return false
    return projectedDistance(station, enemyPosition(ctx.geometry, enemy)) <= patrolRadius
  })

  nearby
    .filter((enemy) => AIR_INTERCEPT_TYPES.has(enemy.typeId)
      && projectedDistance(station, enemyPosition(ctx.geometry, enemy)) <= combat.interceptRadius)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, combat.drones)
    .forEach((enemy) => { enemy.blocked = true })

  tower.cooldown -= ctx.dt
  if (tower.cooldown > 0) return []

  const target = nearby.sort((a, b) => {
    const aIntercept = Number(AIR_INTERCEPT_TYPES.has(a.typeId))
    const bIntercept = Number(AIR_INTERCEPT_TYPES.has(b.typeId))
    return bIntercept - aIntercept || Number(b.air) - Number(a.air) || b.distance - a.distance
  })[0]

  if (!target) {
    tower.targetId = null
    tower.cooldown = 0.08
    return []
  }

  const retargeted = tower.targetId !== target.id
  tower.targetId = target.id
  const distance = projectedDistance(station, enemyPosition(ctx.geometry, target))
  const rawDamage = combat.damage * combat.damageScale[tower.level - 1] * (target.air ? 1 + combat.flyingBonus : 1)
  const damage = effectiveDamage(rawDamage, ctx.growth.damage)

  const events: AttackEvent[] = []
  for (let i = 0; i < combat.drones; i += 1) {
    const result = applyDamage(ctx.geometry, target, damage, 'physical', { position: station, typeId: 'drone-hive' }, 0, ctx.now)
    tower.damageDealt += result.dealt
    events.push({ targetId: target.id, damage, kind: 'physical', result, effect: 'drone', droneIndex: i })
  }
  tower.attacks += 1
  tower.cooldown += combat.cooldown + (retargeted ? distance / 520 : 0)
  return events
}
