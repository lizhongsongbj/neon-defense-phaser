/** 街头佣兵站 —— 原样迁移自 霓虹防线/gameplay.js `_0x27bce2` 中 "street-mercenary" 分支(else 分支) */

import { TOWER_COMBAT } from '../../data/towers'
import { applyDamage, canMercenaryIntercept, enemyPosition } from '../CombatSystem'
import { findNearestRoutePoint, projectedDistance } from '../PathSystem'
import type { MercenaryState, TowerState } from '../types'
import { effectiveDamage, effectiveRange } from './common'
import type { AttackEvent, TowerAttackContext } from './types'

/** 确保集结点已初始化,并在超出射程时收回到最近路线点,原 `_0x26f0b3` */
function ensureRallyPoint(tower: TowerState, ctx: TowerAttackContext, range: number) {
  if (!tower.rallyPoint) {
    const nearest = findNearestRoutePoint(ctx.geometry, tower.source)
    tower.rallyPoint = { x: nearest.x, y: nearest.y }
  }
  if (projectedDistance(tower.source, tower.rallyPoint) > range) {
    const nearest = findNearestRoutePoint(ctx.geometry, tower.source)
    tower.rallyPoint = { x: nearest.x, y: nearest.y }
  }
}

export function resolveStreetMercenary(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  const combat = TOWER_COMBAT['street-mercenary']
  const range = effectiveRange(tower, 'street-mercenary', ctx.growth.range)
  ensureRallyPoint(tower, ctx, range)

  const mercHp = combat.mercenaryHealth * combat.healthScale[tower.level - 1]
  if (!tower.mercs) {
    const mercs: MercenaryState[] = []
    for (let i = 0; i < combat.mercenaryCount; i += 1) {
      mercs.push({ hp: mercHp, cooldown: 0, respawnAt: 0, targetId: null })
    }
    tower.mercs = mercs
  }
  const mercs = tower.mercs

  const blockable = ctx.enemies.filter(
    (e) => canMercenaryIntercept(e, ctx.now) && projectedDistance(tower.rallyPoint!, enemyPosition(ctx.geometry, e)) <= combat.blockRange,
  )

  const events: AttackEvent[] = []
  mercs.forEach((merc, unitIndex) => {
    if (merc.respawnAt) {
      if (ctx.now < merc.respawnAt) return
      merc.respawnAt = 0
      merc.hp = mercHp
    }

    let target = ctx.enemies.find((e) => e.id === merc.targetId && !e.dead && blockable.includes(e))
    if (!target) {
      target = blockable.find((e) => !mercs.some((m) => m !== merc && m.targetId === e.id))
      merc.targetId = target?.id ?? null
    }
    if (!target) return

    target.blocked = true
    const attackScale = ctx.now < target.attackSuppressedUntil ? Math.max(0.1, 1 - target.attackSuppression) : 1
    merc.hp -= target.attack * attackScale * ctx.dt
    if (merc.hp <= 0) {
      merc.targetId = null
      merc.respawnAt = ctx.now + combat.respawn * 1000
      return
    }

    merc.cooldown -= ctx.dt
    if (merc.cooldown <= 0) {
      const damage = effectiveDamage(combat.damage * combat.damageScale[tower.level - 1], ctx.growth.damage)
      const result = applyDamage(ctx.geometry, target, damage, 'physical', { position: tower.source, typeId: 'street-mercenary' }, 0, ctx.now)
      tower.damageDealt += result.dealt
      tower.attacks += 1
      events.push({ targetId: target.id, damage, kind: 'physical', result, effect: 'mercenary', unitIndex })
      merc.cooldown += combat.cooldown
    }
  })

  return events
}
