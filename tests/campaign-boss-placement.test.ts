import test from 'node:test'
import assert from 'node:assert/strict'
import { CAMPAIGN_WAVE_COUNTS } from '../src/data/maps'
import { buildWavePlan } from '../src/systems/WaveSpawner'

test('第七关第十波仅追加一名亚当·重锤Boss', () => {
  assert.equal(CAMPAIGN_WAVE_COUNTS[6], 10)
  const bosses = buildWavePlan(10, 6).filter((entry) => entry.boss)
  assert.deepEqual(bosses.map((entry) => entry.type), ['enforcer'])
})

test('第八关第十波仅追加一名夏娃-9 Boss', () => {
  assert.equal(CAMPAIGN_WAVE_COUNTS[7], 10)
  const bosses = buildWavePlan(10, 7).filter((entry) => entry.boss)
  assert.deepEqual(bosses.map((entry) => entry.type), ['eve'])
})

test('其他关卡和其他波次不会生成任何Boss', () => {
  for (let mapIndex = 0; mapIndex < 8; mapIndex += 1) {
    for (let wave = 1; wave <= 20; wave += 1) {
      if (wave === 10 && (mapIndex === 6 || mapIndex === 7)) continue
      assert.equal(buildWavePlan(wave, mapIndex).some((entry) => entry.boss), false)
    }
  }
})
