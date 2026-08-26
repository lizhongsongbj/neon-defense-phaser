import test from 'node:test'
import assert from 'node:assert/strict'
import { BOSS_TYPES } from '../src/data/bosses'

 test('亚当·重锤只保留堡垒镇压、攻城超载和核心暴露三种形态', () => {
  const stages = BOSS_TYPES.enforcer.stages
  assert.equal(stages.length, 3)
  assert.deepEqual(stages.map((stage) => stage.name), ['堡垒镇压', '攻城超载', '核心暴露'])
  assert.equal(stages[1].ability, 'overdrive-salvo')
  assert.match(stages[1].enterCondition, /导弹舱.*重武器.*赤红.*推进/)
  assert.match(stages[2].enterCondition, /反应堆完全暴露/)
})
