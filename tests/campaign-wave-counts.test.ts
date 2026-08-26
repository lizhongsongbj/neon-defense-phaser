import test from 'node:test'
import assert from 'node:assert/strict'
import { CAMPAIGN_WAVE_COUNTS, MAP_LEVELS } from '../src/data/maps'
import { readFileSync } from 'node:fs'

const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')
const commandCenter = readFileSync(new URL('../src/ui/CommandCenterUI.ts', import.meta.url), 'utf8')

test('八个关卡从第一关8波逐关递增到最终关15波', () => {
  assert.equal(MAP_LEVELS.length, 8)
  assert.deepEqual(CAMPAIGN_WAVE_COUNTS, [8, 9, 10, 11, 12, 13, 14, 15])
  CAMPAIGN_WAVE_COUNTS.slice(1).forEach((waves, index) => {
    assert.equal(waves, CAMPAIGN_WAVE_COUNTS[index] + 1)
  })
})

test('战斗场景和关卡选择界面共用新的关卡波次数量', () => {
  assert.match(battle, /CAMPAIGN_WAVE_COUNTS\[this\.campaign\.mapIndex\] \?\? 8/)
  assert.match(commandCenter, /CAMPAIGN_WAVE_COUNTS\[index\]/)
  assert.match(commandCenter, /CAMPAIGN_WAVE_COUNTS\[this\.selectedMapIndex\]/)
})
