import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DIFFICULTY_MAP_PRESSURE, LATE_MAP_BONUSES, MAP_COEFFICIENTS, REWARD_SCALES } from '../src/data/balance'
import { CAMPAIGN_STARTING_COINS } from '../src/data/maps'

/** 验证新增 8 关都有对应的战役数值，避免后期关卡回退到默认值。 */
test('八张新版地图均具备完整平衡参数', () => {
  assert.equal(MAP_COEFFICIENTS.length, 8)
  assert.equal(LATE_MAP_BONUSES.length, 8)
  assert.equal(CAMPAIGN_STARTING_COINS.length, 8)
  assert.equal(REWARD_SCALES.length, 8)
  assert.equal(DIFFICULTY_MAP_PRESSURE.easy.length, 8)
  assert.equal(DIFFICULTY_MAP_PRESSURE.normal.length, 8)
  assert.equal(DIFFICULTY_MAP_PRESSURE.hard.length, 8)
  assert.ok(CAMPAIGN_STARTING_COINS.every((coins, index, all) => index === 0 || coins >= all[index - 1]))
})
