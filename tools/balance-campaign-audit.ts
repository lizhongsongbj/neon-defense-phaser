/**
 * 战役全量数值审计 CLI —— 原样迁移自 霓虹防线/balance-campaign-audit.js。
 *
 * 原版通过 Playwright 打开浏览器、在页面里调用 `window.BalanceAgent.aggregateScenario`
 * 跑矩阵测试。这里已经把无头模拟器(`src/systems/BalanceSimulator`)做成纯 Node 可运行的
 * TypeScript 模块,不再需要启动浏览器,直接在 Node 里跑同一份场景矩阵、产出同结构的报告。
 *
 * 用法: npm run audit:campaign -- [outputPath] [runsPerScenario]
 *   outputPath        默认 balance-reports/campaign-full-<date>.json
 *   runsPerScenario    默认 30,范围 [10, 200]
 */
import fs from 'node:fs'
import path from 'node:path'

import { MAP_LEVELS, CAMPAIGN_WAVE_COUNTS, CAMPAIGN_STARTING_COINS } from '../src/data/maps'
import { MAP_COEFFICIENTS, LATE_MAP_BONUSES, DIFFICULTY_COEFFICIENTS, DIFFICULTY_MAP_PRESSURE, type Difficulty } from '../src/data/balance'
import { TOWER_IDS } from '../src/data/towers'
import { aggregateScenario, type ScenarioAggregate } from '../src/systems/BalanceSimulator'
import { STRATEGIES, type GrowthBonus, type GrowthBonusMap, type Strategy } from '../src/systems/AutoPilot'

const outputPath = path.resolve(process.argv[2] || `balance-reports/campaign-full-${new Date().toISOString().slice(0, 10)}.json`)
const runs = Math.max(10, Math.min(200, Math.round(Number(process.argv[3]) || 30)))

/** 与原脚本一致的报告专用威胁曲线(比游戏内 CAMPAIGN_THREAT_LEVELS 更陡,仅用于审计对照) */
const AUDIT_THREAT_LEVELS = [1, 1.18, 1.38, 1.62, 1.9, 2.25]
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

const GROWTH_PROFILES: Record<'baseline' | 'veteran', GrowthBonusMap> = {
  baseline: Object.fromEntries(TOWER_IDS.map((id) => [id, { damage: 1, range: 1 } satisfies GrowthBonus])) as GrowthBonusMap,
  veteran: Object.fromEntries(TOWER_IDS.map((id) => [id, { damage: 1.18, range: 1.09 } satisfies GrowthBonus])) as GrowthBonusMap,
}

interface ScenarioRow extends ScenarioAggregate {
  strategy: Strategy
  growthProfile: keyof typeof GROWTH_PROFILES
}

function average(rows: ScenarioAggregate[], key: 'clearRate' | 'averageLeaks' | 'averageHealth'): number {
  return rows.length ? rows.reduce((sum, r) => sum + r[key], 0) / rows.length : 0
}

async function main() {
  const scenarios: ScenarioRow[] = []
  for (const [profileName, growthBonuses] of Object.entries(GROWTH_PROFILES) as [keyof typeof GROWTH_PROFILES, GrowthBonusMap][]) {
    for (const strategy of STRATEGIES) {
      for (let mapIndex = 0; mapIndex < MAP_LEVELS.length; mapIndex += 1) {
        for (const difficulty of DIFFICULTIES) {
          const scenario = aggregateScenario({
            mapIndex,
            difficulty,
            strategy,
            waves: CAMPAIGN_WAVE_COUNTS[mapIndex],
            runs,
            seed: `campaign-audit-v3:${profileName}:${strategy}`,
            growthBonuses,
          })
          scenarios.push({ ...scenario, strategy, growthProfile: profileName })
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }
    }
  }

  const campaignSummary = MAP_LEVELS.map((map, mapIndex) => {
    const forMap = scenarios.filter((s) => s.mapIndex === mapIndex)
    const baseline = forMap.filter((s) => s.growthProfile === 'baseline')
    const veteran = forMap.filter((s) => s.growthProfile === 'veteran')
    const hard = forMap.filter((s) => s.difficulty === 'hard')
    const hardBaseline = baseline.filter((s) => s.difficulty === 'hard')
    const hardVeteran = veteran.filter((s) => s.difficulty === 'hard')
    const normalBaseline = baseline.filter((s) => s.difficulty === 'normal')
    return {
      mapIndex,
      mapName: map.name,
      waves: CAMPAIGN_WAVE_COUNTS[mapIndex],
      threatLevel: AUDIT_THREAT_LEVELS[mapIndex],
      hpCalibration: MAP_COEFFICIENTS[mapIndex],
      startingCoins: CAMPAIGN_STARTING_COINS[mapIndex],
      extraEnemiesPerWave: LATE_MAP_BONUSES[mapIndex],
      totalEnemies: baseline[0]?.enemyCount || 0,
      baselineClearRate: average(baseline, 'clearRate'),
      veteranClearRate: average(veteran, 'clearRate'),
      normalBaselineClearRate: average(normalBaseline, 'clearRate'),
      hardClearRate: average(hard, 'clearRate'),
      hardBaselineClearRate: average(hardBaseline, 'clearRate'),
      hardVeteranClearRate: average(hardVeteran, 'clearRate'),
      averageLeaks: average(baseline, 'averageLeaks'),
      averageRemainingHealth: average(baseline, 'averageHealth'),
      p90WaveDuration: Math.max(...baseline.map((s) => s.p90WaveDuration)),
    }
  })

  const normalBaselineCurve = campaignSummary.map((m) => m.normalBaselineClearRate)
  const normalBaselinePressureMonotonic = normalBaselineCurve.every((rate, i) => i === 0 || rate <= normalBaselineCurve[i - 1] + 0.03)

  const bossSpikes = scenarios
    .filter((s) => s.mapIndex === 5)
    .flatMap((s) =>
      [5, 10].map((wave) => {
        const current = s.waveStats[wave - 1]
        const previous = s.waveStats[wave - 2]
        return {
          strategy: s.strategy,
          difficulty: s.difficulty,
          growthProfile: s.growthProfile,
          wave,
          reachRate: current?.reachRate || 0,
          clearRate: current?.clearRate || 0,
          dropFromPrevious: Math.max(0, (previous?.clearRate || 0) - (current?.clearRate || 0)),
        }
      }),
    )

  const impactByTower = Object.fromEntries(TOWER_IDS.map((id) => [id, 0])) as Record<string, number>
  scenarios.forEach((s) => s.towerTotals.forEach((t) => (impactByTower[t.typeId] += t.impact)))
  const totalImpact = Object.values(impactByTower).reduce((sum, v) => sum + v, 0) || 1
  const towerShares = Object.fromEntries(Object.entries(impactByTower).map(([id, impact]) => [id, impact / totalImpact]))

  const report = {
    version: 3,
    generatedAt: new Date().toISOString(),
    matrix: {
      maps: MAP_LEVELS.length,
      difficulties: DIFFICULTIES,
      strategies: STRATEGIES,
      growthProfiles: Object.keys(GROWTH_PROFILES),
      runsPerScenario: runs,
      scenarioCount: scenarios.length,
      totalCampaignSimulations: scenarios.length * runs,
    },
    configuration: {
      mapCoefficients: MAP_COEFFICIENTS,
      threatLevels: AUDIT_THREAT_LEVELS,
      lateMapBonuses: LATE_MAP_BONUSES,
      startingCoins: CAMPAIGN_STARTING_COINS,
      waveCounts: CAMPAIGN_WAVE_COUNTS,
      difficultyCoefficients: DIFFICULTY_COEFFICIENTS,
      hardMapPressure: DIFFICULTY_MAP_PRESSURE.hard,
    },
    checks: {
      threatLevelsStrictlyIncrease: AUDIT_THREAT_LEVELS.every((v, i, arr) => i === 0 || v > arr[i - 1]),
      lateMapsAllStrengthened: LATE_MAP_BONUSES.slice(3).every((v) => v > 0),
      normalBaselinePressureMonotonic,
      normalBaselineClearCurve: normalBaselineCurve,
      hardClearRates: campaignSummary.map((m) => m.hardClearRate),
      allHardMapsBelowFiftyPercent: campaignSummary.every((m) => m.hardClearRate < 0.5),
      maximumBossWaveDrop: Math.max(...bossSpikes.map((b) => b.dropFromPrevious)),
      towerShares,
    },
    campaignSummary,
    bossSpikes,
    scenarios,
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write(
    `${JSON.stringify({ outputPath, matrix: report.matrix, checks: report.checks, campaignSummary: report.campaignSummary }, null, 2)}\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
