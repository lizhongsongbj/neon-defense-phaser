import { EXPANSION_TOWER_IDS, type AllTowerId } from '../../data/towerExpansion'
import type { TowerState } from '../types'
import { resolveArcNeon } from './ArcNeon'
import { resolveDroneHive } from './DroneHive'
import { resolveHackerRelay } from './HackerRelay'
import { resolveMagRailSniper } from './MagRailSniper'
import { resolveStreetMercenary } from './StreetMercenary'
import { resolveExpansionTower } from './ExpansionTowers'
import type { AttackEvent, TowerAttackContext } from './types'

const RESOLVERS: Record<AllTowerId, (tower: TowerState, ctx: TowerAttackContext) => AttackEvent[]> = {
  'mag-rail-sniper': resolveMagRailSniper,
  'arc-neon': resolveArcNeon,
  'street-mercenary': resolveStreetMercenary,
  'hacker-relay': resolveHackerRelay,
  'drone-hive': resolveDroneHive,
  ...Object.fromEntries(EXPANSION_TOWER_IDS.map((id) => [id, resolveExpansionTower])),
} as Record<AllTowerId, (tower: TowerState, ctx: TowerAttackContext) => AttackEvent[]>

/** 按塔类型分派攻击结算,原 gameplay.js `_0x27bce2` 的顶层 switch */
export function resolveTowerAttack(tower: TowerState, ctx: TowerAttackContext): AttackEvent[] {
  return RESOLVERS[tower.typeId](tower, ctx)
}

export * from './types'
export * from './common'
