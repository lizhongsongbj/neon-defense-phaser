/** 黑客中继器 —— 原样迁移自 霓虹防线/gameplay.js `_0x27bce2` 中 "hacker-relay" 分支 */

import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage } from '../CombatSystem'
import type { TowerState } from '../types'
import { effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

export function resolveHackerRelay(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat = TOWER_COMBAT['hacker-relay']
  tower.cooldown -= ctx.dt
  if (tower.cooldown > 0) return []

  const range = effectiveRange(tower, 'hacker-relay', ctx.growth.range)
  const targets = enemiesInTowerRange(ctx, tower, range)

  tower.cooldown += combat.cooldown
  if (!targets.length) return []
  tower.attacks += 1

  const durationMs = combat.duration * 1000
  const events: AttackEvent[] = []
  targets.forEach((enemy) => {
    enemy.revealedUntil = ctx.now + durationMs
    enemy.slowUntil = ctx.now + durationMs
    enemy.slowAmount = Math.max(enemy.slowAmount, combat.slow)
    enemy.vulnerableUntil = ctx.now + durationMs
    enemy.vulnerability = Math.max(enemy.vulnerability, combat.vulnerability)
    enemy.shieldBlockedUntil = ctx.now + durationMs

    const damage = effectiveDamage(combat.damage * tower.level, ctx.growth.damage)
    const result = applyDamage(ctx.geometry, enemy, damage, 'energy', { position: tower.source, typeId: 'hacker-relay' }, 0, ctx.now)
    tower.damageDealt += result.dealt
    events.push({ targetId: enemy.id, damage, kind: 'energy', result, effect: 'hacker' })
  })
  return events
}
