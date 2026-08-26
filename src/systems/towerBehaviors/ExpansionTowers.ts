import { EXPANSION_TOWER_BY_ID, type ExpansionTowerId } from '../../data/towerExpansion'
import { applyDamage } from '../CombatSystem'
import type { TowerState } from '../types'
import { activeTier4Branch, effectiveDamage, effectiveRange, enemiesInTowerRange } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

const EFFECT_BY_TOWER: Record<ExpansionTowerId, string> = {
  'gravity-nail': 'gravity',
  'grey-tide': 'grey-tide',
  'trajectory-rewriter': 'trajectory',
}

export function resolveExpansionTower(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const typeId = tower.typeId as ExpansionTowerId
  const definition = EXPANSION_TOWER_BY_ID[typeId]
  if (!definition) return []
  const branch = activeTier4Branch(tower)
  const stats = branch?.stats ?? definition.levels[Math.min(2, tower.level - 1)]

  tower.cooldown -= ctx.dt
  if (tower.cooldown > 0) return []

  const range = effectiveRange(tower, typeId, ctx.growth.range)
  const targetLayer = branch?.targetLayer ?? definition.targetLayer
  const includeAir = targetLayer !== 'ground'
  const targets = enemiesInTowerRange(ctx, tower, range, includeAir)
    .filter((enemy) => targetLayer !== 'air' || enemy.air)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, stats.targetCount)

  tower.cooldown += stats.cooldown
  if (!targets.length) return []
  tower.attacks += 1

  const durationSec = branch?.stats.duration ?? definition.levels[Math.min(2, tower.level - 1)].effectDuration
  const slowDuration = branch?.stats.duration ?? definition.levels[Math.min(2, tower.level - 1)].slowDuration
  const durationMs = durationSec * 1000
  const events: AttackEvent[] = []
  for (const enemy of targets) {
    if (stats.slow > 0) {
      enemy.slowUntil = Math.max(enemy.slowUntil, ctx.now + slowDuration * 1000)
      enemy.slowAmount = Math.max(enemy.slowAmount, stats.slow)
    }
    if (stats.armorShred > 0 || stats.energyResistanceShred > 0) {
      enemy.vulnerableUntil = Math.max(enemy.vulnerableUntil, ctx.now + durationMs)
      enemy.vulnerability = Math.max(enemy.vulnerability, stats.armorShred + stats.energyResistanceShred)
    }
    if (stats.pathDisplacement > 0) {
      enemy.distance = Math.max(0, enemy.distance - stats.pathDisplacement)
      tower.utility += stats.pathDisplacement
    }

    const echoScale = typeId === 'trajectory-rewriter' ? 1 + stats.echoRatio : 1
    const damage = effectiveDamage(stats.damage * echoScale, ctx.growth.damage)
    const result = applyDamage(ctx.geometry, enemy, damage, branch?.damageKind ?? definition.damageKind, { position: tower.source, typeId }, 0, ctx.now)
    tower.damageDealt += result.dealt
    events.push({ targetId: enemy.id, damage, kind: branch?.damageKind ?? definition.damageKind, result, effect: EFFECT_BY_TOWER[typeId] })
  }
  return events
}
