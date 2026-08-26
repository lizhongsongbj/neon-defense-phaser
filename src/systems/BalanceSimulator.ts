/**
 * 无头(headless)数值模拟器 —— 原样迁移自 霓虹防线/balance-agent.js 的
 * `simulateCampaign` / `aggregateScenario` / `diagnose` / `runSuite`。
 *
 * 与原版的关键差异(有意为之,且是改进):原版 balance-agent.js 是一份完全独立、
 * 简化的战斗结算重实现(不依赖真实游戏代码,只在浏览器里跑"平行宇宙"模拟)。
 * 这里的波次结算改为直接复用 `spawnEnemy` / `resolveTowerAttack`(towerBehaviors)
 * / `tickEnforcer` / `tickEve` / `isEnemyPhasedAt` / `scaleReward` 等与真实
 * BattleScene 完全同源的纯函数,只有"每波开始前把金币投给哪些塔位/升级"这一个
 * AI 决策问题(见 `AutoPilot.ts`)是数值测试工具独有的逻辑。这样数值报告与真实
 * 玩法的一致性比原版更高。
 *
 * 用途:命令中心"数值测试"面板 + `tools/balance-*.ts` 命令行审计脚本共用。
 */

import { MAP_LEVELS, CAMPAIGN_STARTING_COINS, type MapLevel } from '../data/maps'
import { MAX_HEALTH, type Difficulty, scaleReward } from '../data/balance'
import { MAX_REWARD } from '../data/waveEconomy'
import { TOWER_IDS, TOWER_TYPE_BY_ID, type TowerId } from '../data/towers'
import { buildMapGeometry, type MapGeometry } from './PathSystem'
import { buildWavePlan, scheduleWave } from './WaveSpawner'
import { spawnEnemy, isEnemyPhasedAt, tickEnemyTraits } from './CombatSystem'
import { resolveTowerAttack } from './towerBehaviors'
import { tickEnforcer } from './bossBehaviors/Enforcer'
import { tickEve } from './bossBehaviors/Eve'
import { createRng, type Rng } from '../utils/rng'
import { autoInvest, NEUTRAL_GROWTH_BONUSES, STRATEGIES, type GrowthBonusMap, type Strategy } from './AutoPilot'
import type { BattleState } from './types'

const WAVE_TIME_LIMIT_SECONDS = 190
const TICK_SECONDS = 0.1
const TICK_MS = 100

export interface ScenarioOptions {
  mapIndex: number
  difficulty: Difficulty
  strategy?: Strategy
  waves: number
  runs: number
  seed: string
  growthBonuses?: GrowthBonusMap
}

export interface WaveOutcome {
  wave: number
  cleared: boolean
  timedOut: boolean
  duration: number
  healthBefore: number
  healthAfter: number
  leaks: number
  coinsBefore: number
  coinsAfter: number
  kills: number
  towerCount: number
}

export interface TowerContribution {
  typeId: TowerId
  built: number
  damage: number
  utility: number
  spent: number
  attacks: number
}

export interface CampaignRunResult {
  cleared: boolean
  health: number
  coins: number
  leaks: number
  kills: number
  waves: WaveOutcome[]
  towers: TowerContribution[]
}

/** 单波战斗结算(自动投资 → 出怪 → 逐帧结算),原 `_0x286f3d` */
function simulateWave(
  battle: BattleState,
  mapLevel: MapLevel,
  geometry: MapGeometry,
  wave: number,
  totalWaves: number,
  strategy: Strategy,
  rng: Rng,
  growthBonuses: GrowthBonusMap,
): WaveOutcome {
  battle.wave = wave
  const invested = autoInvest({
    coins: battle.coins,
    towers: battle.towers,
    mapLevel,
    geometry,
    wave,
    mapIndex: battle.mapIndex,
    strategy,
    rng,
    growthBonuses,
  })
  battle.coins = invested.coins
  battle.towers = invested.towers

  const scheduled = scheduleWave(buildWavePlan(wave, battle.mapIndex))
  const healthBefore = battle.health
  const coinsBefore = battle.coins
  const killsBefore = battle.kills

  const growthFor = (typeId: TowerId) => growthBonuses[typeId] ?? { damage: 1, range: 1 }

  let waveElapsedSeconds = 0
  let spawnCursor = 0
  let timedOut = false

  while (true) {
    battle.now += TICK_MS
    waveElapsedSeconds += TICK_SECONDS

    while (spawnCursor < scheduled.length && scheduled[spawnCursor].spawnAt <= waveElapsedSeconds) {
      const entry = scheduled[spawnCursor]
      spawnCursor += 1
      battle.enemySequence += 1
      battle.enemies.push(
        spawnEnemy({ id: battle.enemySequence, mapIndex: battle.mapIndex, wave, difficulty: battle.difficulty, now: battle.now, entry }),
      )
    }

    for (const enemy of battle.enemies) enemy.blocked = false

    for (const enemy of battle.enemies) {
      if (enemy.dead) continue
      if (enemy.typeId === 'enforcer') tickEnforcer(enemy, battle.mapIndex, battle.now)
      else if (enemy.typeId === 'eve') tickEve(enemy, battle.mapIndex, battle.now)
      enemy.phased = isEnemyPhasedAt(enemy, battle.now)
    }

    for (const tower of battle.towers) {
      resolveTowerAttack(tower, {
        geometry,
        enemies: battle.enemies.filter((e) => !e.dead),
        dt: TICK_SECONDS,
        now: battle.now,
        growth: growthFor(tower.typeId as TowerId),
      })
    }

    tickEnemyTraits(geometry, battle.enemies, battle.now, TICK_SECONDS)

    for (const enemy of battle.enemies) {
      if (enemy.dead || enemy.blocked) continue
      enemy.distance += enemy.speed * TICK_SECONDS
      if (enemy.distance >= 1000) {
        enemy.dead = true
        battle.leaks += 1
        battle.health = Math.max(0, battle.health - enemy.baseDamage)
      }
    }

    for (let i = battle.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = battle.enemies[i]
      if (!enemy.dead) continue
      if (enemy.distance < 1000) {
        battle.coins += scaleReward(enemy.reward, battle.mapIndex)
        battle.kills += 1
      }
      battle.enemies.splice(i, 1)
    }

    if (battle.health <= 0) break
    if (spawnCursor >= scheduled.length && battle.enemies.length === 0) break
    if (waveElapsedSeconds >= WAVE_TIME_LIMIT_SECONDS) {
      timedOut = true
      break
    }
  }

  const cleared = battle.health > 0 && !timedOut
  if (cleared) {
    const earlyBonus = wave < totalWaves ? scaleReward(MAX_REWARD, battle.mapIndex) : 0
    battle.coins += scaleReward(45 + wave * 10, battle.mapIndex) + earlyBonus
  }

  return {
    wave,
    cleared,
    timedOut,
    duration: Math.min(waveElapsedSeconds, WAVE_TIME_LIMIT_SECONDS),
    healthBefore,
    healthAfter: battle.health,
    leaks: healthBefore - battle.health,
    coinsBefore,
    coinsAfter: battle.coins,
    kills: battle.kills - killsBefore,
    towerCount: battle.towers.length,
  }
}

/** 完整跑一局战役(直到失败或跑完所有波次),原 `_0x22abfe` */
export function simulateCampaign(options: ScenarioOptions): CampaignRunResult {
  const rng = createRng(options.seed)
  const mapIndex = options.mapIndex
  const mapLevel = MAP_LEVELS[mapIndex]
  const geometry = buildMapGeometry(mapLevel)
  const strategy = options.strategy ?? 'adaptive'
  const growthBonuses = options.growthBonuses ?? NEUTRAL_GROWTH_BONUSES

  const battle: BattleState = {
    mapIndex,
    difficulty: options.difficulty,
    geometry,
    wave: 1,
    coins: CAMPAIGN_STARTING_COINS[mapIndex] ?? 700,
    health: MAX_HEALTH,
    kills: 0,
    leaks: 0,
    towers: [],
    enemies: [],
    enemySequence: 0,
    now: 0,
  }

  const waves: WaveOutcome[] = []
  for (let wave = 1; wave <= options.waves; wave += 1) {
    const outcome = simulateWave(battle, mapLevel, geometry, wave, options.waves, strategy, rng, growthBonuses)
    waves.push(outcome)
    if (!outcome.cleared) break
  }

  const towers: TowerContribution[] = TOWER_IDS.map((typeId) => {
    const matching = battle.towers.filter((t) => t.typeId === typeId)
    return {
      typeId,
      built: matching.length,
      damage: matching.reduce((sum, t) => sum + t.damageDealt, 0),
      utility: matching.reduce((sum, t) => sum + t.utility, 0),
      spent: matching.reduce((sum, t) => sum + t.spent, 0),
      attacks: matching.reduce((sum, t) => sum + t.attacks, 0),
    }
  })

  return {
    cleared: waves.length === options.waves && waves.every((w) => w.cleared),
    health: battle.health,
    coins: battle.coins,
    leaks: battle.leaks,
    kills: battle.kills,
    waves,
    towers,
  }
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))]
}

export interface WaveStat {
  wave: number
  reachRate: number
  clearRate: number
  averageLeaks: number
  averageDuration: number
  p90Duration: number
  averageCoinsBefore: number
  averageCoinsAfter: number
  averageKills: number
  enemyCount: number
}

export interface TowerTotal {
  typeId: TowerId
  name: string
  built: number
  damage: number
  utility: number
  impact: number
  spent: number
}

export interface ScenarioAggregate {
  mapIndex: number
  mapName: string
  difficulty: Difficulty
  strategy: Strategy
  runs: number
  waves: number
  startingCoins: number
  enemyCount: number
  clearRate: number
  averageHealth: number
  averageCoins: number
  averageLeaks: number
  averageKills: number
  averageTowerCount: number
  p90WaveDuration: number
  towerTotals: TowerTotal[]
  waveStats: WaveStat[]
}

/** 同一场景(地图+难度+策略)重复跑 N 次并汇总统计,原 `_0x1a1d59` */
export function aggregateScenario(options: ScenarioOptions): ScenarioAggregate {
  const strategy = options.strategy ?? 'adaptive'
  const runs: CampaignRunResult[] = []
  for (let i = 0; i < options.runs; i += 1) {
    runs.push(simulateCampaign({ ...options, strategy, seed: `${options.seed}:${options.mapIndex}:${options.difficulty}:${i}` }))
  }

  const towerTotals: TowerTotal[] = TOWER_IDS.map((typeId) => {
    const per = runs.map((r) => r.towers.find((t) => t.typeId === typeId)!)
    const damage = per.reduce((sum, t) => sum + t.damage, 0)
    const utility = per.reduce((sum, t) => sum + t.utility, 0)
    return {
      typeId,
      name: TOWER_TYPE_BY_ID[typeId].name,
      built: per.reduce((sum, t) => sum + t.built, 0) / options.runs,
      damage,
      utility,
      impact: damage + utility,
      spent: per.reduce((sum, t) => sum + t.spent, 0) / options.runs,
    }
  })

  const waveStats: WaveStat[] = []
  for (let wave = 1; wave <= options.waves; wave += 1) {
    const observed = runs.map((r) => r.waves.find((w) => w.wave === wave)).filter((w): w is WaveOutcome => Boolean(w))
    waveStats.push({
      wave,
      reachRate: observed.length / options.runs,
      clearRate: observed.filter((w) => w.cleared).length / options.runs,
      averageLeaks: average(observed.map((w) => w.leaks)),
      averageDuration: average(observed.map((w) => w.duration)),
      p90Duration: percentile(observed.map((w) => w.duration), 0.9),
      averageCoinsBefore: average(observed.map((w) => w.coinsBefore)),
      averageCoinsAfter: average(observed.map((w) => w.coinsAfter)),
      averageKills: average(observed.map((w) => w.kills)),
      enemyCount: buildWavePlan(wave, options.mapIndex).length,
    })
  }

  return {
    mapIndex: options.mapIndex,
    mapName: MAP_LEVELS[options.mapIndex].name,
    difficulty: options.difficulty,
    strategy,
    runs: options.runs,
    waves: options.waves,
    startingCoins: CAMPAIGN_STARTING_COINS[options.mapIndex] ?? 700,
    enemyCount: Array.from({ length: options.waves }, (_, i) => buildWavePlan(i + 1, options.mapIndex).length).reduce(
      (sum, n) => sum + n,
      0,
    ),
    clearRate: runs.filter((r) => r.cleared).length / options.runs,
    averageHealth: average(runs.map((r) => r.health)),
    averageCoins: average(runs.map((r) => r.coins)),
    averageLeaks: average(runs.map((r) => r.leaks)),
    averageKills: average(runs.map((r) => r.kills)),
    averageTowerCount: average(runs.map((r) => r.towers.reduce((sum, t) => sum + t.built, 0))),
    p90WaveDuration: percentile(
      runs.flatMap((r) => r.waves.map((w) => w.duration)),
      0.9,
    ),
    towerTotals,
    waveStats,
  }
}

export interface DiagnosisFinding {
  severity: 'ok' | 'warning' | 'critical'
  code: string
  text: string
}

export interface Diagnosis {
  score: number
  verdict: string
  findings: DiagnosisFinding[]
  towerShares: Record<TowerId, number>
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', normal: '普通', hard: '困难' }
/** 各难度目标通关率区间,原 `_0x3771d3` */
const DIFFICULTY_CLEAR_RATE_TARGET: Record<Difficulty, [number, number]> = {
  easy: [0.65, 0.99],
  normal: [0.4, 0.79],
  hard: [0.1, 0.49],
}

/** 对一批场景做数值诊断:难度断层、Boss波断崖、单塔垄断/边缘化,原 `_0x59c807` */
export function diagnose(scenarios: ScenarioAggregate[]): Diagnosis {
  const findings: DiagnosisFinding[] = []
  let clearRateIssuePenalty = 0
  let varianceIssuePenalty = 0

  scenarios.forEach((scenario) => {
    const [low, high] = DIFFICULTY_CLEAR_RATE_TARGET[scenario.difficulty]
    if (scenario.clearRate < low) {
      const severity = scenario.clearRate < low * 0.55 ? 'critical' : 'warning'
      findings.push({
        severity,
        code: 'too-hard',
        text: `${scenario.mapName} · ${DIFFICULTY_LABEL[scenario.difficulty]} 通关率仅 ${Math.round(scenario.clearRate * 100)}%`,
      })
      clearRateIssuePenalty += severity === 'critical' ? 14 : 8
    } else if (scenario.clearRate > high) {
      findings.push({
        severity: 'warning',
        code: 'too-easy',
        text: `${scenario.mapName} · ${DIFFICULTY_LABEL[scenario.difficulty]} 通关率 ${Math.round(scenario.clearRate * 100)}%，压力偏低`,
      })
      clearRateIssuePenalty += 6
    }

    for (let i = 4; i < scenario.waveStats.length; i += 5) {
      const current = scenario.waveStats[i]
      const previous = scenario.waveStats[i - 1]
      if (previous.clearRate - current.clearRate > 0.32) {
        findings.push({
          severity: 'warning',
          code: 'boss-spike',
          text: `${scenario.mapName} 第 ${current.wave} 波出现 ${Math.round((previous.clearRate - current.clearRate) * 100)} 个百分点断崖`,
        })
        clearRateIssuePenalty += 7
      }
    }
  })

  ;(['easy', 'normal', 'hard'] as Difficulty[]).forEach((difficulty) => {
    const rates = scenarios.filter((s) => s.difficulty === difficulty).map((s) => s.clearRate)
    if (rates.length > 1 && Math.max(...rates) - Math.min(...rates) > 0.38) {
      findings.push({
        severity: 'warning',
        code: 'map-variance',
        text: `${DIFFICULTY_LABEL[difficulty]}难度的地图通关率差距超过 38 个百分点`,
      })
      varianceIssuePenalty += 8
    }
  })

  const impactByTower: Record<TowerId, number> = Object.fromEntries(TOWER_IDS.map((id) => [id, 0])) as Record<TowerId, number>
  scenarios.forEach((s) => s.towerTotals.forEach((t) => (impactByTower[t.typeId] += t.impact)))
  const totalImpact = Object.values(impactByTower).reduce((sum, v) => sum + v, 0) || 1
  const towerShares = Object.fromEntries(
    Object.entries(impactByTower).map(([id, impact]) => [id, impact / totalImpact]),
  ) as Record<TowerId, number>

  Object.entries(towerShares).forEach(([typeId, share]) => {
    const name = scenarios[0]?.towerTotals.find((t) => t.typeId === typeId)?.name ?? typeId
    if (share > 0.48) {
      findings.push({ severity: 'warning', code: 'tower-dominant', text: `${name}占总战术贡献 ${Math.round(share * 100)}%，可能挤压其他塔楼` })
      varianceIssuePenalty += 8
    } else if (share < 0.035) {
      findings.push({ severity: 'warning', code: 'tower-weak', text: `${name}仅占总战术贡献 ${Math.round(share * 100)}%，需要检查使用价值` })
      varianceIssuePenalty += 5
    }
  })

  const clearRatePenalty = (clearRateIssuePenalty / Math.max(1, scenarios.length)) * 2.3
  const score = Math.round(Math.max(0, Math.min(100, 100 - clearRatePenalty - varianceIssuePenalty)))
  if (!findings.length) {
    findings.push({ severity: 'ok', code: 'balanced', text: '当前样本未发现明显难度断层或单塔垄断' })
  }

  return {
    score,
    verdict: score >= 85 ? '数值合理' : score >= 65 ? '需要观察' : '存在失衡',
    findings,
    towerShares,
  }
}

export interface SuiteOptions {
  mapIndexes?: number[]
  difficulties?: Difficulty[]
  strategy?: Strategy
  waves?: number
  waveCounts?: number[] | null
  runs?: number
  seed?: string
  growthBonuses?: GrowthBonusMap
}

export interface SuiteReport extends Diagnosis {
  version: number
  generatedAt: string
  options: {
    mapIndexes: number[]
    difficulties: Difficulty[]
    runs: number
    waves?: number
    waveCounts: number[] | null
    strategy: Strategy
    seed: string
  }
  scenarios: ScenarioAggregate[]
}

export interface RunSuiteCallbacks {
  onProgress?: (progress: { completed: number; total: number; scenario: ScenarioAggregate }) => void
}

/**
 * 遍历地图 × 难度矩阵跑聚合场景 + 汇总诊断,原 `_0x5c19bc`。可能耗时较长,建议只在开发环境使用。
 * 每个场景之间让出一次事件循环(与原版一致),避免长时间阻塞浏览器主线程/UI 进度条卡死。
 */
export async function runSuite(options: SuiteOptions, callbacks: RunSuiteCallbacks = {}): Promise<SuiteReport> {
  const mapIndexes = options.mapIndexes?.length ? options.mapIndexes : MAP_LEVELS.map((_, i) => i)
  const difficulties: Difficulty[] = options.difficulties?.length ? options.difficulties : ['easy', 'normal', 'hard']
  const strategy: Strategy = options.strategy && STRATEGIES.includes(options.strategy) ? options.strategy : 'adaptive'
  const seed = options.seed || 'neon-defense-balance-v1'
  const runs = Math.max(1, Math.min(200, Math.round(options.runs ?? 20)))

  const scenarios: ScenarioAggregate[] = []
  const total = mapIndexes.length * difficulties.length
  let completed = 0

  for (const mapIndex of mapIndexes) {
    for (const difficulty of difficulties) {
      const waves = Math.max(1, Math.min(30, Math.round(options.waveCounts?.[mapIndex] ?? options.waves ?? 10)))
      const scenario = aggregateScenario({ mapIndex, difficulty, strategy, waves, runs, seed, growthBonuses: options.growthBonuses })
      scenarios.push(scenario)
      completed += 1
      callbacks.onProgress?.({ completed, total, scenario })
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  const diagnosis = diagnose(scenarios)
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    options: {
      mapIndexes,
      difficulties,
      runs,
      waves: options.waves,
      waveCounts: options.waveCounts ?? null,
      strategy,
      seed,
    },
    scenarios,
    ...diagnosis,
  }
}
