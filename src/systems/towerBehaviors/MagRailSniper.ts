/** 磁轨狙击台 —— 原样迁移自 霓虹防线/gameplay.js `_0x27bce2` 中 "mag-rail-sniper" 分支 */

import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage } from '../CombatSystem'
import type { TowerState } from '../types'
import { distanceToEnemy, effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

export function resolveMagRailSniper(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat = TOWER_COMBAT['mag-rail-sniper']
  tower.cooldown -= ctx.dt
  if (tower.cooldown > 0) return []

  const range = effectiveRange(tower, 'mag-rail-sniper', ctx.growth.range)
  const candidates = enemiesInTowerRange(ctx, tower, range).filter(
    (e) => distanceToEnemy(ctx, tower, e) >= combat.blindSpot,
  )
  const target = candidates.reduce<typeof candidates[number] | null>(
    (best, e) => (!best || e.hp + e.shield > best.hp + best.shield ? e : best),
    null,
  )

  tower.cooldown += combat.cooldown
  if (!target) return []

  const damage = effectiveDamage(combat.damage * combat.damageScale[tower.level - 1], ctx.growth.damage)
  const result = applyDamage(ctx.geometry, target, damage, 'physical', { position: tower.source, typeId: 'mag-rail-sniper' }, combat.armorPenetration, ctx.now)
  tower.attacks += 1
  tower.damageDealt += result.dealt

  return [{ targetId: target.id, damage, kind: 'physical', result, effect: 'rail' }]
}
