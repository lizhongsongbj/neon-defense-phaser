/**
 * AUTO 演示代理规划器 —— 原样迁移自 霓虹防线/auto-demo.js。
 *
 * 这是玩家可见的功能(战场右侧「AUTO 演示」按钮),不是数值面板那类纯开发者工具:
 * 让 AI 代打当前关卡,每隔一段时间做一次建造/升级决策。评分算法与
 * `AutoPilot.ts`(数值测试用的贪心投资代理)是原版里两套独立调好的启发式,
 * 故意保持不同,这里按原文件里的常量/公式原样保留,不与 AutoPilot 合并。
 */

import { TOWER_COMBAT, TOWER_IDS, TOWER_TYPE_BY_ID, type TowerId } from '../data/towers'
import { projectedDistance, routePoint, type MapGeometry } from './PathSystem'
import type { GrowthBonus, GrowthBonusMap } from './AutoPilot'
import type { HudTowerSnapshot } from '../state/EventBus'
import type { MapLevel, TowerSlot } from '../data/maps'

/** 各地图允许出现的塔型池(早期地图故意限制塔型种类),原 `_0x38a59c` */
const ALL_TOWER_IDS: TowerId[] = ['arc-neon', 'street-mercenary', 'mag-rail-sniper', 'hacker-relay', 'drone-hive']
const MAP_ROSTERS: TowerId[][] = [
  ['arc-neon', 'street-mercenary', 'mag-rail-sniper'],
  ['arc-neon', 'street-mercenary', 'mag-rail-sniper', 'hacker-relay'],
  ALL_TOWER_IDS,
  ALL_TOWER_IDS,
  ALL_TOWER_IDS,
  ALL_TOWER_IDS,
]

/** 塔型专属覆盖率倍率,原 `_0x11162c` */
const COVERAGE_MULTIPLIER: Partial<Record<TowerId, number>> = {
  'arc-neon': 1.2,
  'hacker-relay': 1.08,
  'drone-hive': 1.04,
}

function blindSpotOf(typeId: TowerId): number | undefined {
  return typeId === 'mag-rail-sniper' ? TOWER_COMBAT['mag-rail-sniper'].blindSpot : undefined
}

/** 某塔型在给定塔位/等级下的覆盖率评分,原 `_0x28ef30` */
function coverageScore(
  typeId: TowerId,
  slot: { x: number; y: number; rangeScale?: number },
  level: 1 | 2 | 3,
  geometry: MapGeometry,
  growthBonuses: GrowthBonusMap,
): number {
  const combat = TOWER_COMBAT[typeId] as { ranges: [number, number, number] }
  const range = combat.ranges[level - 1] * (growthBonuses[typeId]?.range ?? 1) * Math.max(1, Number(slot.rangeScale) || 1)
  const source = { x: slot.x * 10, y: slot.y * 10 }
  const blindSpot = blindSpotOf(typeId)

  let coverage = 0
  let nearestSeparation = Infinity
  let sampleCount = 0
  for (const lane of ['left', 'right'] as const) {
    for (let distance = 40; distance <= 960; distance += 40) {
      const point = routePoint(geometry, distance, lane)
      const separation = projectedDistance(source, point)
      nearestSeparation = Math.min(nearestSeparation, separation)
      sampleCount += 1
      if (separation <= range && (!blindSpot || separation >= blindSpot)) {
        coverage += 1 - (separation / Math.max(range, 1)) * 0.2
      }
    }
  }

  if (typeId === 'street-mercenary') {
    if (nearestSeparation <= range) return 1.15 - (nearestSeparation / range) * 0.35
    return 0
  }
  return (coverage / Math.max(1, sampleCount)) * (COVERAGE_MULTIPLIER[typeId] ?? 1)
}

/** 策略/波次/地图相关的塔型优先权重,原 `_0x18adbd` */
function priorityWeight(typeId: TowerId, towers: HudTowerSnapshot[], wave: number, mapIndex: number): number {
  const countByType = Object.fromEntries(ALL_TOWER_IDS.map((id) => [id, towers.filter((t) => t.typeId === id).length])) as Record<
    TowerId,
    number
  >
  let weight = 1 / (1 + countByType[typeId] * 0.55)
  if (!countByType[typeId]) weight *= 1.55
  if (typeId === 'arc-neon' && wave <= 2) weight *= 1.28
  if (typeId === 'mag-rail-sniper' && (wave >= 2 || mapIndex === 5)) weight *= 1.24
  if (typeId === 'hacker-relay' && mapIndex >= 1) weight *= 1.16
  if (typeId === 'drone-hive' && mapIndex >= 2) weight *= 1.2
  return weight
}

export interface DemoBattleSnapshot {
  coins: number
  towers: HudTowerSnapshot[]
  slots: (TowerSlot & { slotIndex: number })[]
}

export interface DemoContext {
  mapLevel: MapLevel
  geometry: MapGeometry
  mapIndex: number
  wave: number
  growthBonuses: GrowthBonusMap
}

export interface DemoBuildAction {
  kind: 'build'
  typeId: TowerId
  slotIndex: number
  cost: number
  score: number
}

export interface DemoUpgradeAction {
  kind: 'upgrade'
  typeId: TowerId
  slotIndex: number
  level: number
  cost: number
  score: number
}

/** 挑选评分最高的可行建造动作,原 `_0x218341` */
export function chooseBuildAction(battle: DemoBattleSnapshot, ctx: DemoContext): DemoBuildAction | null {
  const occupied = new Set(battle.towers.map((t) => t.slotIndex))
  const roster = MAP_ROSTERS[Math.max(0, Math.min(MAP_ROSTERS.length - 1, ctx.mapIndex))]
  let best: DemoBuildAction | null = null

  roster.forEach((typeId) => {
    const def = TOWER_TYPE_BY_ID[typeId]
    if (!def || def.cost > battle.coins) return
    battle.slots.forEach((slot) => {
      if (occupied.has(slot.slotIndex)) return
      const score = coverageScore(typeId, slot, 1, ctx.geometry, ctx.growthBonuses) * priorityWeight(typeId, battle.towers, ctx.wave, ctx.mapIndex)
      if (!best || score > best.score) {
        best = { kind: 'build', typeId, slotIndex: slot.slotIndex, score, cost: def.cost }
      }
    })
  })
  return best
}

/** 挑选评分最高的可行升级动作,原 `_0x28f09a` */
export function chooseUpgradeAction(battle: DemoBattleSnapshot, ctx: DemoContext): DemoUpgradeAction | null {
  let best: DemoUpgradeAction | null = null
  battle.towers.forEach((tower) => {
    if (tower.level >= 3 || !(tower.typeId in TOWER_TYPE_BY_ID)) return
    const typeId = tower.typeId as TowerId
    const def = TOWER_TYPE_BY_ID[typeId]
    const cost = Math.round(def.cost * (tower.level === 1 ? 0.7 : 1.05))
    if (cost > battle.coins) return
    const slot = battle.slots[tower.slotIndex]
    if (!slot) return
    const before = coverageScore(typeId, slot, tower.level as 1 | 2 | 3, ctx.geometry, ctx.growthBonuses)
    const after = coverageScore(typeId, slot, (tower.level + 1) as 1 | 2 | 3, ctx.geometry, ctx.growthBonuses)
    const score =
      ((after + Math.max(0.08, after - before) * 2) * priorityWeight(typeId, battle.towers, ctx.wave, ctx.mapIndex)) /
      (1 + tower.level * 0.12)
    if (!best || score > best.score) {
      best = { kind: 'upgrade', typeId, slotIndex: tower.slotIndex, level: tower.level, score, cost }
    }
  })
  return best
}

export const NEUTRAL_GROWTH: GrowthBonusMap = Object.fromEntries(
  TOWER_IDS.map((id) => [id, { damage: 1, range: 1 } satisfies GrowthBonus]),
) as GrowthBonusMap
