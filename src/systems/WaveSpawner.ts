/**
 * 波次生成 —— 原样迁移自 霓虹防线/gameplay.js 中的 `_0x5a1326` (buildWavePlan)。
 */

import { ENEMY_TYPES, type EnemyId } from '../data/enemies'
import { CAMPAIGN_ENEMY_ROSTERS } from '../data/waveComposition'
import { LATE_MAP_BONUSES } from '../data/balance'
import { MAP_LEVELS, type Lane } from '../data/maps'
import type { BossId } from '../data/bosses'
import type { WaveRosterEntry } from './types'

/**
 * 生成第 `wave` 波、第 `mapIndex` 张地图的敌人出场清单。
 * 精英怪替换规则保留原逻辑；普通敌人会轮流分配到本关所有入口。
 */
export function buildWavePlan(wave: number, mapIndex: number): WaveRosterEntry[] {
  const roster: WaveRosterEntry[] = []
  const unlocked = new Set<EnemyId>(CAMPAIGN_ENEMY_ROSTERS[mapIndex] ?? CAMPAIGN_ENEMY_ROSTERS[0])
  const count = 7 + wave * 2 + (LATE_MAP_BONUSES[mapIndex] ?? 0)

  for (let i = 0; i < count; i += 1) {
    let planned: EnemyId = 'gang'
    if (wave >= 2 && i % 6 === 3) planned = 'riot'
    if (wave >= 3 && i % 5 === 2) planned = 'ninja'
    if (wave >= 3 && i % 7 === 5) planned = 'devourer'
    if (wave >= 4 && i % 8 === 6) planned = 'aerostat'
    if (wave >= 5 && i % 9 === 4) planned = 'faraday'
    if (wave >= 6 && i % 10 === 8) planned = 'hijacker'
    if (wave >= 3 && i % 11 === 7) planned = 'neurohound'
    if (wave >= 5 && i % 13 === 9) planned = 'matriarch'
    if (wave >= 6 && i % 12 === 10) planned = 'bonebreaker'

    const actual: EnemyId = unlocked.has(planned) ? planned : 'gang'
    const plannedDef = ENEMY_TYPES[planned]
    const actualDef = ENEMY_TYPES[actual]
    const plannedEhp = (plannedDef.hp + (plannedDef.shield ?? 0)) / (1 - (plannedDef.armor ?? 0))
    const actualEhp = (actualDef.hp + (actualDef.shield ?? 0)) / (1 - (actualDef.armor ?? 0))

    roster.push({
      type: actual,
      boss: false,
      elite: actual !== planned,
      power: plannedEhp / actualEhp,
      speed: actualDef.speed,
      attack: actualDef.attack,
      reward: actualDef.reward,
      lane: (i % 2 === 0 ? 'left' : 'right') as Lane,
      routeIndex: i % Math.max(1, MAP_LEVELS[mapIndex]?.entranceRoutes.length ?? 2),
      delay: planned === 'bonebreaker' ? 1.25
        : planned === 'riot' || planned === 'faraday' ? 1.15
          : planned === 'matriarch' ? 1.05
            : planned === 'hijacker' ? 0.9
              : planned === 'neurohound' ? 0.48 : 0.72,
    })
  }

  const bossPeriod = mapIndex >= 5 ? 5 : 10
  if (wave % bossPeriod === 0) {
    const bossId: BossId = Math.floor(wave / bossPeriod) % 2 === 1 ? 'enforcer' : 'eve'
    roster.push({
      type: bossId,
      boss: true,
      lane: (wave % 2 === 0 ? 'right' : 'left') as Lane,
      routeIndex: (wave + 1) % Math.max(1, MAP_LEVELS[mapIndex]?.entranceRoutes.length ?? 2),
      delay: 2.2,
    })
  }

  return roster
}

/** 波次进度调度:把 roster 转成带 spawnAt(秒) 的出场表,原 gameplay.js requestAnimationFrame 内的出怪计时器 */
export function scheduleWave(roster: WaveRosterEntry[]): Array<WaveRosterEntry & { spawnAt: number }> {
  const scheduled: Array<WaveRosterEntry & { spawnAt: number }> = []
  let cursor = 0.2
  for (const entry of roster) {
    scheduled.push({ ...entry, spawnAt: cursor })
    cursor += entry.delay
  }
  return scheduled
}
