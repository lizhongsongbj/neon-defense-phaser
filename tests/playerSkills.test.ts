import { test } from 'node:test'
import assert from 'node:assert/strict'
import { playerSkillCooldown, playerSkillUpgradeCost } from '../src/data/playerSkills'

test('主动技能升级只缩短冷却时间', () => {
  assert.deepEqual(
    [1, 2, 3].map((level) => playerSkillCooldown('pulse-overload', level)),
    [24, 20, 16],
  )
  assert.deepEqual(
    [1, 2, 3].map((level) => playerSkillCooldown('quantum-firewall', level)),
    [28, 23, 18],
  )
})

test('主动技能解锁和升级消耗研发点', () => {
  assert.deepEqual(
    [0, 1, 2].map((level) => playerSkillUpgradeCost('pulse-overload', level)),
    [3, 2, 3],
  )
  assert.deepEqual(
    [0, 1, 2].map((level) => playerSkillUpgradeCost('quantum-firewall', level)),
    [4, 2, 3],
  )
})
