import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const effects = readFileSync(new URL('../src/entities/EffectsLayer.ts', import.meta.url), 'utf8')
const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')

test('电弧攻击包含主电弧、回声电弧、分叉和放电火花', () => {
  assert.match(effects, /const echo = makeBolt/)
  assert.match(effects, /const branchCount = Math\.max\(3/)
  assert.match(effects, /const sourceGlow = this\.scene\.add\.circle/)
  assert.match(effects, /for \(let sparkIndex = 1; sparkIndex <= 4/)
})

test('多目标电弧从上一命中目标继续跳跃', () => {
  assert.match(battle, /let previousArcTarget:/)
  assert.match(battle, /const origin = previousArcTarget/)
  assert.match(battle, /previousArcTarget = targetScreen/)
})
