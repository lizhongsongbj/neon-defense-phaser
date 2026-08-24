/** 无人机蜂巢 —— 原样迁移自 霓虹防线/gameplay.js `_0x27bce2` 中 "drone-hive" 分支 */

import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage } from '../CombatSystem'
import type { TowerState } from '../types'
import { distanceToEnemy, effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

export function resolveDroneHive(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat = TOWER_COMBAT['drone-hive']
  tower.cooldown -= ctx.dt
  if (tower.cooldown > 0) return []

  const baseRange = effectiveRange(tower, 'drone-hive', ctx.growth.range)
  const searchRange = baseRange + (tower.targetId != null ? combat.pursuit : 0)
  const target = enemiesInTowerRange(ctx, tower, searchRange).sort(
    (a, b) => Number(b.air) - Number(a.air) || b.distance - a.distance,
  )[0]

  if (!target) {
    tower.targetId = null
    tower.cooldown = 0.08
    return []
  }

  const retargeted = tower.targetId !== target.id
  tower.targetId = target.id
  const distance = distanceToEnemy(ctx, tower, target)
  const rawDamage = combat.damage * combat.damageScale[tower.level - 1] * (target.air ? 1 + combat.flyingBonus : 1)
  const damage = effectiveDamage(rawDamage, ctx.growth.damage)

  const events: AttackEvent[] = []
  for (let i = 0; i < combat.drones; i += 1) {
    const result = applyDamage(ctx.geometry, target, damage, 'physical', { position: tower.source, typeId: 'drone-hive' }, 0, ctx.now)
    tower.damageDealt += result.dealt
    events.push({ targetId: target.id, damage, kind: 'physical', result, effect: 'drone', droneIndex: i })
  }
  tower.attacks += 1
  tower.cooldown += combat.cooldown + (retargeted ? distance / 420 : 0)
  return events
}
