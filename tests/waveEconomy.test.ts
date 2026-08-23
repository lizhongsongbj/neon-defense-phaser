import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COUNTDOWN_SECONDS, MAX_REWARD, MIN_REWARD, earlyWaveReward } from '../src/data/waveEconomy'

test('提前开波奖励公式与原版一致', () => {
  assert.equal(earlyWaveReward(0), 0, '倒计时结束时无奖励')
  assert.equal(earlyWaveReward(-1), 0, '负数倒计时无奖励')
  assert.equal(earlyWaveReward(COUNTDOWN_SECONDS), MAX_REWARD, '立即调用给出最大奖励')
  assert.equal(earlyWaveReward(6), 13, '半倒计时给出成比例的奖励')
  assert.equal(earlyWaveReward(0.2), MIN_REWARD, '接近结束时给出最小奖励')
})

test('提前开波奖励随剩余时间单调不减', () => {
  let previous = 0
  for (let t = 0.25; t <= COUNTDOWN_SECONDS; t += 0.25) {
    const reward = earlyWaveReward(t)
    assert.ok(reward >= previous, '奖励必须随剩余准备时间增加')
    previous = reward
  }
})
