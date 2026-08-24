/** 电弧霓虹塔 —— 原样迁移自 霓虹防线/gameplay.js `_0x27bce2` 中 "arc-neon" 分支 */

import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage } from '../CombatSystem'
import { projectedDistance } from '../PathSystem'
import { enemyPosition } from '../CombatSystem'
import type { EnemyState, TowerState } from '../types'
import { effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

export function resolveArcNeon(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat = TOWER_COMBAT['arc-neon']
  tower.cooldown -= ctx.dt
  if (tower.cooldown > 0) return []

  const range = effectiveRange(tower, 'arc-neon', ctx.growth.range)
  const inRange = enemiesInTowerRange(ctx, tower, range, false).sort((a, b) => a.distance - b.distance)

  const chain: EnemyState[] = []
  if (inRange[0]) chain.push(inRange[0])
  while (chain.length && chain.length < 3) {
    const last = chain[chain.length - 1]
    const lastPos = enemyPosition(ctx.geometry, last)
    const next = ctx.enemies
      .filter((e) => !e.dead && !e.air && !chain.includes(e))
      .filter((e) => projectedDistance(lastPos, enemyPosition(ctx.geometry, e)) <= combat.chainDistance)
      .sort((a, b) => projectedDistance(lastPos, enemyPosition(ctx.geometry, a)) - projectedDistance(lastPos, enemyPosition(ctx.geometry, b)))[0]
    if (!next) break
    chain.push(next)
  }

  tower.cooldown += combat.cooldown
  if (!chain.length) return []
  tower.attacks += 1

  const events: AttackEvent[] = []
  chain.forEach((enemy, index) => {
    const isWet = enemy.distance >= 390 && enemy.distance <= 520
    const rawDamage = combat.chainDamage[index] * combat.damageScale[tower.level - 1] * (isWet ? 1 + combat.wetBonus : 1)
    const damage = effectiveDamage(rawDamage, ctx.growth.damage)
    const result = applyDamage(ctx.geometry, enemy, damage, 'energy', { position: tower.source, typeId: 'arc-neon' }, 0, ctx.now)
    tower.damageDealt += result.dealt
    events.push({ targetId: enemy.id, damage, kind: 'energy', result, effect: 'arc', chainIndex: index })
  })
  return events
}
