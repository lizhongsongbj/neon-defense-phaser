import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const actor = readFileSync(new URL('../src/entities/EnemyActor.ts', import.meta.url), 'utf8')

test('怪物动画始终保持配置尺寸，不会重置为素材原始大小', () => {
  assert.doesNotMatch(actor, /this\.sprite\.setScale\(1\)/)
  assert.match(actor, /this\.sprite\.setDisplaySize\(this\.baseSize, this\.baseSize\)/)
  assert.doesNotMatch(actor, /SOLID_ATTACK_IDS/)
  assert.match(actor, /scaleY: \{ from: exitScaleY, to: exitScaleY \* 0\.72 \}/)
})

