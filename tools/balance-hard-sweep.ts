/**
 * 困难难度系数扫描 CLI —— 原样迁移自 霓虹防线/balance-hard-sweep.js。
 * 同 `balance-campaign-audit.ts`,不再需要浏览器/Playwright,直接在 Node 里
 * 临时改写 `DIFFICULTY_COEFFICIENTS.hard` 跑一遍矩阵,对比不同系数下的困难难度通关率。
 *
 * 用法: npm run sweep:hard -- [runsPerScenario] [candidateList]
 *   runsPerScenario  默认 10,范围 [5, 100]
 *   candidateList    逗号分隔的候选系数,默认 "1.15,1.25,1.35,1.45,1.55,1.65"
 */
import { MAP_LEVELS, CAMPAIGN_WAVE_COUNTS } from '../src/data/maps'
import { DIFFICULTY_COEFFICIENTS } from '../src/data/balance'
import { TOWER_IDS } from '../src/data/towers'
import { aggregateScenario } from '../src/systems/BalanceSimulator'
import { STRATEGIES, type GrowthBonus, type GrowthBonusMap } from '../src/systems/AutoPilot'

const runs = Math.max(5, Math.min(100, Math.round(Number(process.argv[2]) || 10)))
const candidates = (process.argv[3] || '1.15,1.25,1.35,1.45,1.55,1.65')
  .split(',')
  .map(Number)
  .filter(Number.isFinite)

const GROWTH_PROFILES: Record<'baseline' | 'veteran', GrowthBonusMap> = {
  baseline: Object.fromEntries(TOWER_IDS.map((id) => [id, { damage: 1, range: 1 } satisfies GrowthBonus])) as GrowthBonusMap,
  veteran: Object.fromEntries(TOWER_IDS.map((id) => [id, { damage: 1.18, range: 1.09 } satisfies GrowthBonus])) as GrowthBonusMap,
}

async function main() {
  const originalHardCoefficient = DIFFICULTY_COEFFICIENTS.hard
  const results = []

  for (const candidate of candidates) {
    // 数值测试专用的临时覆盖,和原脚本一样只在扫描期间生效,跑完立即还原
    ;(DIFFICULTY_COEFFICIENTS as Record<'hard', number>).hard = candidate
    const perMapClearRates: number[][] = MAP_LEVELS.map(() => [])
    for (const [profileName, growthBonuses] of Object.entries(GROWTH_PROFILES) as [string, GrowthBonusMap][]) {
      for (const strategy of STRATEGIES) {
        for (let mapIndex = 0; mapIndex < MAP_LEVELS.length; mapIndex += 1) {
          const scenario = aggregateScenario({
            mapIndex,
            difficulty: 'hard',
            strategy,
            waves: CAMPAIGN_WAVE_COUNTS[mapIndex],
            runs,
            seed: `hard-sweep:${profileName}:${strategy}`,
            growthBonuses,
          })
          perMapClearRates[mapIndex].push(scenario.clearRate)
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }
    }
    const mapClearRates = perMapClearRates.map((rates) => rates.reduce((sum, r) => sum + r, 0) / rates.length)
    results.push({
      coefficient: candidate,
      campaignClearRate: mapClearRates.reduce((sum, r) => sum + r, 0) / mapClearRates.length,
      maximumMapClearRate: Math.max(...mapClearRates),
      mapClearRates,
    })
  }

  ;(DIFFICULTY_COEFFICIENTS as Record<'hard', number>).hard = originalHardCoefficient
  process.stdout.write(`${JSON.stringify({ runs, candidates: results }, null, 2)}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
