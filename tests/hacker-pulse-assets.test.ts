import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../public/assets/effects/hacker-relay-selected-pulse/', import.meta.url)

test('圈选的黑客脉冲已生成完整16帧透明序列', () => {
  for (let frame = 1; frame <= 16; frame += 1) {
    const suffix = String(frame).padStart(2, '0')
    assert.equal(existsSync(new URL(`frame-${suffix}.png`, root)), true)
  }
  assert.equal(existsSync(new URL('hacker-relay-selected-pulse.webp', root)), true)
})

test('圈选脉冲沿用一级塔的55毫秒逐帧生成、显现与消散节奏', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8')) as {
    frameCount: number
    frameDurationMs: number
    timing: Record<string, string>
  }
  assert.equal(manifest.frameCount, 16)
  assert.equal(manifest.frameDurationMs, 55)
  assert.deepEqual(manifest.timing, {
    generate: 'frames 1-6',
    reveal: 'frames 7-13',
    dissolve: 'frames 14-16',
  })
})
