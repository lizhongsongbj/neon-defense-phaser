import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage, enemyPosition } from '../CombatSystem'
import { projectedDistance } from '../PathSystem'
import type { EnemyState, TowerState } from '../types'
import { activeTier4Branch, effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

export function resolveArcNeon(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat = TOWER_COMBAT['arc-neon']
  const branch = activeTier4Branch(tower)
  tower.cooldown -= ctx.dt
  if (tower.cooldown > 0) return []
  const range = effectiveRange(tower, 'arc-neon', ctx.growth.range)
  const inRange = enemiesInTowerRange(ctx, tower, range, false).sort((a, b) => a.distance - b.distance)
  const chain: EnemyState[] = []
  if (inRange[0]) chain.push(inRange[0])
  const chainCount = branch?.stats.chainCount || 3
  const chainDistance = branch?.stats.chainDistance || combat.chainDistance
  while (chain.length && chain.length < chainCount) {
    const last = chain[chain.length - 1]
    const lastPos = enemyPosition(ctx.geometry, last)
    const next = ctx.enemies.filter((e) => !e.dead && !e.air && !chain.includes(e))
      .filter((e) => projectedDistance(lastPos, enemyPosition(ctx.geometry, e)) <= chainDistance)
      .sort((a, b) => projectedDistance(lastPos, enemyPosition(ctx.geometry, a)) - projectedDistance(lastPos, enemyPosition(ctx.geometry, b)))[0]
    if (!next) break
    chain.push(next)
  }
  tower.cooldown += branch?.stats.cooldown ?? combat.cooldown
  if (!chain.length) return []
  tower.attacks += 1
  const branchDamage = branch?.id === 'arc-neon-storm-core' ? [82,65,50,38,28] : branch ? [72,58,44] : null
  return chain.map((enemy, index) => {
    const isWet = enemy.distance >= 390 && enemy.distance <= 520
    const wetBonus = branch?.id === 'arc-superconductor-tide' ? .4 : combat.wetBonus
    const raw = branchDamage?.[index] ?? combat.chainDamage[index] * combat.damageScale[Math.min(2, tower.level - 1)]
    const damage = effectiveDamage(raw * (isWet ? 1 + wetBonus : 1), ctx.growth.damage)
    if (branch?.stats.duration) {
      enemy.slowUntil = Math.max(enemy.slowUntil, ctx.now + branch.stats.duration * 1000)
      enemy.slowAmount = Math.max(enemy.slowAmount, branch.stats.slow)
      enemy.vulnerableUntil = Math.max(enemy.vulnerableUntil, ctx.now + branch.stats.duration * 1000)
      enemy.vulnerability = Math.max(enemy.vulnerability, branch.stats.vulnerability + branch.stats.energyResistanceShred)
    }
    const result = applyDamage(ctx.geometry, enemy, damage, 'energy', { position: tower.source, typeId: 'arc-neon' }, 0, ctx.now)
    tower.damageDealt += result.dealt
    return { targetId: enemy.id, damage, kind: 'energy' as const, result, effect: 'arc', chainIndex: index }
  })
}
