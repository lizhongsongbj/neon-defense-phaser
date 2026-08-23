import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DIFFICULTY_MAP_PRESSURE, LATE_MAP_BONUSES, MAP_COEFFICIENTS, REWARD_SCALES } from '../src/data/balance'
import { CAMPAIGN_STARTING_COINS } from '../src/data/maps'

/**
 * 移植自 霓虹防线/late-level-balance.test.js 的核心断言:原测试直接对源码文本
 * 做正则匹配,这里改为对迁移后的数值常量做等值校验,验证迁移过程中数值未被改动。
 */
test('地图与难度平衡数值与原版逐字一致', () => {
  assert.deepEqual(MAP_COEFFICIENTS, [1.3, 1.1, 1.45, 1.5, 1.6, 0.8])
  assert.deepEqual(LATE_MAP_BONUSES, [0, 0, 0, 2, 2, 2])
  assert.deepEqual(CAMPAIGN_STARTING_COINS, [700, 725, 750, 850, 1100, 1500])
  assert.deepEqual(REWARD_SCALES, [1, 1, 1, 1, 0.55, 0.3])
  assert.deepEqual(DIFFICULTY_MAP_PRESSURE.easy, [1.8, 1.6, 1.65, 1.55, 1.5, 1.55])
  assert.deepEqual(DIFFICULTY_MAP_PRESSURE.normal, [1.28, 1.25, 1.26, 1.1, 1.05, 1.4])
  assert.deepEqual(DIFFICULTY_MAP_PRESSURE.hard, [1.22, 1.22, 1.13, 1.06, 1, 1.27])
})
