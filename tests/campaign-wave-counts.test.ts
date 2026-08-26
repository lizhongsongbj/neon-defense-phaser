import test from 'node:test'
import assert from 'node:assert/strict'
import { CAMPAIGN_WAVE_COUNTS, MAP_LEVELS } from '../src/data/maps'
import { readFileSync } from 'node:fs'

const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')
const commandCenter = readFileSync(new URL('../src/ui/CommandCenterUI.ts', import.meta.url), 'utf8')

test('第七关和第八关固定为十波Boss关卡', () => {
  assert.equal(MAP_LEVELS.length, 8)
  assert.deepEqual(CAMPAIGN_WAVE_COUNTS, [8, 9, 10, 11, 12, 13, 10, 10])
  assert.equal(CAMPAIGN_WAVE_COUNTS[6], 10)
  assert.equal(CAMPAIGN_WAVE_COUNTS[7], 10)
})

test('战斗场景和关卡选择界面共用新的关卡波次数量', () => {
  assert.match(battle, /CAMPAIGN_WAVE_COUNTS\[this\.campaign\.mapIndex\] \?\? 8/)
  assert.match(commandCenter, /CAMPAIGN_WAVE_COUNTS\[index\]/)
  assert.match(commandCenter, /CAMPAIGN_WAVE_COUNTS\[this\.selectedMapIndex\]/)
})

