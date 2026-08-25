/**
 * 自动部署代理 —— 原样迁移自 霓虹防线/balance-agent.js 中的贪心建造/升级评分逻辑
 * (`_0x1593f2` 敌情预估、`_0x5b258a` 策略权重、`_0x314348` 覆盖率评分、`_0x28814f` 贪心投资循环)。
 *
 * 这是原版遗留的开发者工具之一 —— 数值测试面板(自动代理跑图)与命令行数值审计脚本
 * 都依赖这里的建造/升级 AI 来"代打"若干波战斗,不面向普通玩家。
 *
 * 与原版不同的是,这里不重新实现伤害结算/索敌等战斗逻辑 —— 那些直接复用
 * `systems/towerBehaviors` 与 `systems/CombatSystem`(与 BattleScene 完全同源),
 * 本文件只负责"在每波开始前,把金币花在哪些塔位/升级上"这一个决策问题。
 */

import { TOWER_COMBAT, TOWER_IDS, TOWER_TYPE_BY_ID, type TowerId } from '../data/towers'
import { towerUpgradeCost } from './Economy'
import { buildWavePlan } from './WaveSpawner'
import { findNearestRoutePoint, projectedDistance, routePointByIndex, toBoardUnits, type MapGeometry } from './PathSystem'
import type { MapLevel } from '../data/maps'
import type { Rng } from '../utils/rng'
import type { TowerState } from './types'

export type Strategy = 'adaptive' | 'offense' | 'defense'
export const STRATEGIES: Strategy[] = ['adaptive', 'offense', 'defense']

/** 策略 × 塔型权重,原 `_0xb2e8c2` */
export const STRATEGY_TOWER_WEIGHTS: Record<Strategy, Record<TowerId, number>> = {
  adaptive: { 'arc-neon': 1, 'drone-hive': 1, 'hacker-relay': 1, 'mag-rail-sniper': 1, 'street-mercenary': 1 },
  offense: { 'arc-neon': 1.22, 'drone-hive': 1.16, 'hacker-relay': 0.76, 'mag-rail-sniper': 1.24, 'street-mercenary': 0.72 },
  defense: { 'arc-neon': 0.96, 'drone-hive': 0.94, 'hacker-relay': 1.28, 'mag-rail-sniper': 0.92, 'street-mercenary': 1.32 },
}

/** 每种策略预留的金币缓冲(建造/升级循环中始终保留这部分金币不投入),原 `_0x5b7c43` */
export const STRATEGY_COIN_RESERVE: Record<Strategy, number> = { adaptive: 80, offense: 20, defense: 60 }

/** 塔楼等级 1/2/3 的强度倍率,用于估算升级收益,原 `_0x6a096d` */
export const TOWER_LEVEL_MULTIPLIER: [number, number, number] = [1, 1.36, 1.78]

export interface GrowthBonus {
  damage: number
  range: number
}
export type GrowthBonusMap = Record<TowerId, GrowthBonus>

export const NEUTRAL_GROWTH_BONUSES: GrowthBonusMap = Object.fromEntries(
  TOWER_IDS.map((id) => [id, { damage: 1, range: 1 }]),
) as GrowthBonusMap

export interface EnemyMixEstimate {
  gang: number
  riot: number
  ninja: number
  aerostat: number
  devourer: number
  faraday: number
  hijacker: number
  neurohound: number
  matriarch: number
  bonebreaker: number
  boss: number
}

/** 预估未来 N 波的敌情构成(按数量占比归一化),原 `_0x1593f2` */
export function estimateUpcomingEnemyMix(fromWave: number, mapIndex: number, windowSize = 4): EnemyMixEstimate {
  const mix: EnemyMixEstimate = { gang: 0, riot: 0, ninja: 0, aerostat: 0, devourer: 0, faraday: 0, hijacker: 0, neurohound: 0, matriarch: 0, bonebreaker: 0, boss: 0 }
  for (let wave = fromWave; wave < fromWave + windowSize; wave += 1) {
    buildWavePlan(wave, mapIndex).forEach((entry) => {
      if (entry.boss) mix.boss += 1
      else {
        const key = entry.type as keyof EnemyMixEstimate
        mix[key] = (mix[key] ?? 0) + 1
      }
    })
  }
  const total = Object.values(mix).reduce((sum, v) => sum + v, 0) || 1
  for (const key of Object.keys(mix) as Array<keyof EnemyMixEstimate>) mix[key] /= total
  return mix
}

/** 某塔型对当前敌情构成的克制权重 × 策略偏好,原 `_0x5b258a` */
export function towerPressureWeight(typeId: TowerId, mix: EnemyMixEstimate, strategy: Strategy): number {
  const base: Record<TowerId, number> = {
    'arc-neon': 1 + mix.gang * 2.2 + mix.ninja * 0.6 + mix.neurohound * 1.5 + mix.bonebreaker * 3.1 - mix.faraday * 1.4,
    'drone-hive': 1 + mix.aerostat * 4 + mix.ninja * 0.5 + mix.neurohound * 0.8 - mix.hijacker * 1.5,
    'hacker-relay': 0.8 + mix.ninja * 3.2 + mix.devourer * 3.2 + mix.hijacker * 4.2 + mix.neurohound * 1.2 + mix.boss * 0.8,
    'mag-rail-sniper': 1 + mix.riot * 3.4 + mix.faraday * 4.2 + mix.matriarch * 3.6 + mix.boss * 5 + mix.devourer * 0.7,
    'street-mercenary': 1 + (mix.gang + mix.riot + mix.ninja + mix.devourer + mix.faraday + mix.neurohound + mix.matriarch + mix.bonebreaker) * 1.15 - mix.aerostat * 1.2,
  }
  return Math.max(0.2, base[typeId]) * STRATEGY_TOWER_WEIGHTS[strategy][typeId]
}

function blindSpotOf(typeId: TowerId): number | undefined {
  return typeId === 'mag-rail-sniper' ? TOWER_COMBAT['mag-rail-sniper'].blindSpot : undefined
}

/**
 * 某个塔位在给定塔型/等级下的覆盖率评分(0~约1.4),用于建造/升级决策打分,原 `_0x314348`。
 * 这只是一个用于 AI 决策的启发式指标,与真实索敌/伤害结算(towerBehaviors)完全独立。
 */
export function towerCoverageScore(
  typeId: TowerId,
  source: { x: number; y: number },
  level: 1 | 2 | 3,
  geometry: MapGeometry,
  growthBonuses: GrowthBonusMap,
  rangeScale = 1,
): number {
  const combat = TOWER_COMBAT[typeId] as { ranges: [number, number, number] }
  const range = combat.ranges[level - 1] * (growthBonuses[typeId]?.range ?? 1) * rangeScale
  const blindSpot = blindSpotOf(typeId)

  let coverageSum = 0
  let sampleCount = 0
  for (let routeIndex = 0; routeIndex < geometry.routes.length; routeIndex += 1) {
    for (let distance = 20; distance <= 980; distance += 20) {
      const separation = projectedDistance(source, routePointByIndex(geometry, distance, routeIndex))
      sampleCount += 1
      if (separation <= range && (!blindSpot || separation >= blindSpot)) {
        coverageSum += (distance >= 300 && distance <= 760 ? 1.18 : 1) * (1 - (separation / Math.max(range, 1)) * 0.22)
      }
    }
  }
  const average = coverageSum / Math.max(1, sampleCount)

  if (typeId === 'street-mercenary') {
    const nearest = findNearestRoutePoint(geometry, source)
    if (nearest.separation <= range) return 0.62 + (1 - nearest.separation / range) * 0.38
    return 0.02
  }
  if (typeId === 'arc-neon') return average * 1.18
  if (typeId === 'hacker-relay') return average * 1.1
  return average
}

function createTowerState(typeId: TowerId, slotIndex: number, mapLevel: MapLevel, rng: Rng): TowerState {
  const slot = mapLevel.slots[slotIndex]
  return {
    id: `t${slotIndex}`,
    typeId,
    slotIndex,
    source: toBoardUnits(slot),
    rangeScale: Math.max(1, Number(slot.rangeScale) || 1),
    level: 1,
    spent: TOWER_TYPE_BY_ID[typeId].cost,
    cooldown: rng() * 0.25,
    targetId: null,
    rallyPoint: null,
    mercs: null,
    damageDealt: 0,
    utility: 0,
    attacks: 0,
  }
}

interface BuildCandidate {
  kind: 'build'
  typeId: TowerId
  slotIndex: number
  cost: number
  score: number
}
interface UpgradeCandidate {
  kind: 'upgrade'
  tower: TowerState
  cost: number
  score: number
}
type InvestCandidate = BuildCandidate | UpgradeCandidate

/**
 * 每波开始前的贪心投资循环:反复挑选当前"性价比"最高的建造/升级动作直到金币耗尽
 * (预留策略缓冲)或找不到可行动作,原 `_0x28814f`。最多迭代 40 次(与原版一致的安全上限)。
 */
export function autoInvest(params: {
  coins: number
  towers: TowerState[]
  mapLevel: MapLevel
  geometry: MapGeometry
  wave: number
  mapIndex: number
  strategy: Strategy
  rng: Rng
  growthBonuses?: GrowthBonusMap
}): { coins: number; towers: TowerState[] } {
  const { mapLevel, geometry, wave, mapIndex, strategy, rng } = params
  const growthBonuses = params.growthBonuses ?? NEUTRAL_GROWTH_BONUSES
  let coins = params.coins
  const towers = params.towers.slice()
  const mix = estimateUpcomingEnemyMix(wave, mapIndex, 4)
  const reserve = STRATEGY_COIN_RESERVE[strategy]

  let guard = 0
  while (guard < 40) {
    guard += 1
    const occupiedSlots = new Set(towers.map((t) => t.slotIndex))
    const missingTowerIds = TOWER_IDS.filter((id) => !towers.some((t) => t.typeId === id))
    const candidates: InvestCandidate[] = []

    TOWER_IDS.forEach((typeId) => {
      const def = TOWER_TYPE_BY_ID[typeId]
      if (!def || def.cost > coins - reserve) return
      mapLevel.slots.forEach((slot, slotIndex) => {
        if (occupiedSlots.has(slotIndex)) return
        const source = toBoardUnits(slot)
        const rangeScale = Math.max(1, Number(slot.rangeScale) || 1)
        const coverage = towerCoverageScore(typeId, source, 1, geometry, growthBonuses, rangeScale)
        let priorityBoost = missingTowerIds.includes(typeId) && towers.length < 5 ? 5 : 1
        if (missingTowerIds.includes(typeId) && typeId === 'drone-hive' && mix.aerostat > 0) priorityBoost *= 2.2
        if (missingTowerIds.includes(typeId) && typeId === 'hacker-relay' && mix.ninja + mix.devourer + mix.hijacker > 0) priorityBoost *= 1.35
        const score =
          (towerPressureWeight(typeId, mix, strategy) * (0.18 + coverage) * priorityBoost) / def.cost * (0.96 + rng() * 0.08)
        candidates.push({ kind: 'build', typeId, slotIndex, cost: def.cost, score })
      })
    })

    if (!missingTowerIds.length || towers.length >= 5) {
      towers.forEach((tower) => {
        if (tower.level >= 3) return
        const cost = towerUpgradeCost(tower.typeId, tower.level)
        if (cost > coins - reserve) return
        const multipliers: number[] = TOWER_LEVEL_MULTIPLIER
        const before = multipliers[tower.level - 1]
        const after = multipliers[tower.level]
        const coverage = towerCoverageScore(typeId, tower.source, tower.level, geometry, growthBonuses, tower.rangeScale)
        const score = (towerPressureWeight(typeId, mix, strategy) * coverage * (after - before)) / cost * (0.97 + rng() * 0.06)
        candidates.push({ kind: 'upgrade', tower, cost, score })
      })
    }

    if (!candidates.length) break
    candidates.sort((a, b) => b.score - a.score)
    const best = candidates[0]
    coins -= best.cost
    if (best.kind === 'build') {
      towers.push(createTowerState(best.typeId, best.slotIndex, mapLevel, rng))
    } else {
      best.tower.level = (best.tower.level + 1) as 1 | 2 | 3
      best.tower.spent += best.cost
    }
  }

  return { coins, towers }
}
