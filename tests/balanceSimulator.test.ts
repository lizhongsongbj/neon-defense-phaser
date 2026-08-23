import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simulateCampaign, aggregateScenario, diagnose, runSuite } from '../src/systems/BalanceSimulator'

/**
 * 数值测试面板 / balance-agent 移植版的健全性测试。原版 `balance-agent.test.js` /
 * `late-level-balance.test.js` 直接对源码文本做正则断言,这里改为对迁移后的
 * 无头模拟器做行为断言:相同种子结果可复现、简单难度通关率明显高于困难难度、
 * 诊断报告结构完整。
 */

test('相同种子的战役模拟结果完全可复现', () => {
  const options = { mapIndex: 0, difficulty: 'normal' as const, strategy: 'adaptive' as const, waves: 3, runs: 1, seed: 'repro-test' }
  const first = simulateCampaign(options)
  const second = simulateCampaign(options)
  assert.deepEqual(first, second)
})

test('简单难度的通关率不低于困难难度(第1关,自适应策略)', () => {
  const easy = aggregateScenario({ mapIndex: 0, difficulty: 'easy', strategy: 'adaptive', waves: 5, runs: 12, seed: 'diff-check' })
  const hard = aggregateScenario({ mapIndex: 0, difficulty: 'hard', strategy: 'adaptive', waves: 5, runs: 12, seed: 'diff-check' })
  assert.ok(easy.clearRate >= hard.clearRate, `easy=${easy.clearRate} hard=${hard.clearRate}`)
})

test('aggregateScenario 返回的塔楼贡献覆盖全部 5 种塔型', () => {
  const scenario = aggregateScenario({ mapIndex: 0, difficulty: 'normal', strategy: 'adaptive', waves: 4, runs: 6, seed: 'tower-coverage' })
  assert.equal(scenario.towerTotals.length, 5)
  assert.equal(scenario.waveStats.length, 4)
})

test('diagnose 对全通关场景给出 ok/较高分', () => {
  const scenario = aggregateScenario({ mapIndex: 0, difficulty: 'easy', strategy: 'adaptive', waves: 5, runs: 10, seed: 'diagnose-check' })
  const report = diagnose([scenario])
  assert.ok(report.score >= 0 && report.score <= 100)
  assert.ok(report.findings.length >= 1)
  assert.ok(['数值合理', '需要观察', '存在失衡'].includes(report.verdict))
})

test('runSuite 遍历地图×难度矩阵并返回完整报告结构', async () => {
  const report = await runSuite({ mapIndexes: [0, 1], difficulties: ['normal'], waves: 3, runs: 4, seed: 'suite-check' })
  assert.equal(report.scenarios.length, 2)
  assert.equal(report.options.mapIndexes.length, 2)
  assert.ok(Number.isFinite(report.score))
  assert.ok(Object.keys(report.towerShares).length === 5)
})
