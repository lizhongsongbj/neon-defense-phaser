import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../public/assets/effects/arc-neon-lightning/', import.meta.url)

test('一级电弧塔闪电已提取为完整16帧透明特效', () => {
  for (let frame = 1; frame <= 16; frame += 1) {
    const suffix = String(frame).padStart(2, '0')
    assert.equal(existsSync(new URL(`frame-${suffix}.png`, root)), true)
  }
  assert.equal(existsSync(new URL('arc-neon-lightning.webp', root)), true)
})

test('进阶塔闪电保持一级塔原有55毫秒逐帧节奏', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8')) as { frameCount: number; frameDurationMs: number }
  assert.equal(manifest.frameCount, 16)
  assert.equal(manifest.frameDurationMs, 55)
})
