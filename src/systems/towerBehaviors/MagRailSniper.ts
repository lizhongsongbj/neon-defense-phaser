import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage } from '../CombatSystem'
import type { TowerState } from '../types'
import { activeTier4Branch, distanceToEnemy, effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

export function resolveMagRailSniper(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat = TOWER_COMBAT['mag-rail-sniper']
  const branch = activeTier4Branch(tower)
  tower.cooldown -= ctx.dt
  if (tower.cooldown > 0) return []
  const range = effectiveRange(tower, 'mag-rail-sniper', ctx.growth.range)
  const blindSpot = branch?.id === 'rail-sky-judicator' ? 45 : branch?.id === 'rail-quantum-citybreaker' ? 65 : combat.blindSpot
  const targets = enemiesInTowerRange(ctx, tower, range)
    .filter((enemy) => distanceToEnemy(ctx, tower, enemy) >= blindSpot)
    .sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield))
    .slice(0, branch?.stats.targetCount ?? 1)
  tower.cooldown += branch?.stats.cooldown ?? combat.cooldown
  if (!targets.length) return []
  tower.attacks += 1
  const falloff = branch?.id === 'rail-quantum-citybreaker' ? [1, .8, .65, .5] : branch ? [1, .7] : [1]
  return targets.map((target, index) => {
    const baseDamage = branch?.stats.damage ?? combat.damage * combat.damageScale[Math.min(2, tower.level - 1)]
    const airScale = target.air ? 1 + (branch?.stats.flyingBonus ?? 0) : 1
    const damage = effectiveDamage(baseDamage * (falloff[index] ?? .5) * airScale, ctx.growth.damage)
    const result = applyDamage(ctx.geometry, target, damage, 'physical', { position: tower.source, typeId: 'mag-rail-sniper' }, branch?.stats.armorPenetration ?? combat.armorPenetration, ctx.now)
    tower.damageDealt += result.dealt
    return { targetId: target.id, damage, kind: 'physical' as const, result, effect: 'rail' }
  })
}
