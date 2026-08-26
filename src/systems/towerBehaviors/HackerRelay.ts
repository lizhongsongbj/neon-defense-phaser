import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage } from '../CombatSystem'
import type { TowerState } from '../types'
import { activeTier4Branch, effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

export function resolveHackerRelay(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat = TOWER_COMBAT['hacker-relay']
  const branch = activeTier4Branch(tower)
  tower.cooldown -= ctx.dt
  if (tower.cooldown > 0) return []
  const range = effectiveRange(tower, 'hacker-relay', ctx.growth.range)
  const targets = enemiesInTowerRange(ctx, tower, range)
    .sort((a,b) => branch?.id === 'hacker-black-ice-breaker' ? b.shield - a.shield : b.distance - a.distance)
    .slice(0, branch?.stats.targetCount ?? Number.POSITIVE_INFINITY)
  tower.cooldown += branch?.stats.cooldown ?? combat.cooldown
  if (!targets.length) return []
  tower.attacks += 1
  const duration = branch?.stats.duration ?? combat.duration
  return targets.map((enemy) => {
    enemy.revealedUntil = Math.max(enemy.revealedUntil, ctx.now + duration * 1000)
    enemy.slowUntil = Math.max(enemy.slowUntil, ctx.now + duration * 1000)
    enemy.slowAmount = Math.max(enemy.slowAmount, branch?.stats.slow ?? combat.slow)
    enemy.vulnerableUntil = Math.max(enemy.vulnerableUntil, ctx.now + duration * 1000)
    enemy.vulnerability = Math.max(enemy.vulnerability, (branch?.stats.vulnerability ?? combat.vulnerability) + (branch?.stats.energyResistanceShred ?? 0))
    enemy.shieldBlockedUntil = Math.max(enemy.shieldBlockedUntil, ctx.now + duration * 1000)
    const damage = effectiveDamage(branch?.stats.damage ?? combat.damage * Math.min(3, tower.level), ctx.growth.damage)
    const result = applyDamage(ctx.geometry, enemy, damage, 'energy', { position: tower.source, typeId: 'hacker-relay' }, 0, ctx.now)
    tower.damageDealt += result.dealt
    return { targetId: enemy.id, damage, kind: 'energy' as const, result, effect: 'hacker' }
  })
}
