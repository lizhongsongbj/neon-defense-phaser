import type { TowerId } from '../../data/towers'
import type { TowerState } from '../types'
import { resolveArcNeon } from './ArcNeon'
import { resolveDroneHive } from './DroneHive'
import { resolveHackerRelay } from './HackerRelay'
import { resolveMagRailSniper } from './MagRailSniper'
import { resolveStreetMercenary } from './StreetMercenary'
import type { AttackEvent, TowerAttackContext } from './types'

const RESOLVERS: Record<TowerId, (tower: TowerState, ctx: TowerAttackContext) => AttackEvent[]> = {
  'mag-rail-sniper': resolveMagRailSniper,
  'arc-neon': resolveArcNeon,
  'street-mercenary': resolveStreetMercenary,
  'hacker-relay': resolveHackerRelay,
  'drone-hive': resolveDroneHive,
}

/** 按塔类型分派攻击结算,原 gameplay.js `_0x27bce2` 的顶层 switch */
export function resolveTowerAttack(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  return RESOLVERS[tower.typeId](tower, ctx)
}

export * from './types'
export * from './common'
