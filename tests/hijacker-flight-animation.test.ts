import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { enemyAnimationFramePath } from '../src/data/enemyRuntimeAnimations'

const root = new URL('../public/assets/animations/enemies/', import.meta.url)
const enemies = readFileSync(new URL('../src/data/enemies.ts', import.meta.url), 'utf8')
const catalog = readFileSync(new URL('../src/data/animationCatalog.ts', import.meta.url), 'utf8')
const preload = readFileSync(new URL('../src/scenes/PreloadScene.ts', import.meta.url), 'utf8')
const actor = readFileSync(new URL('../src/entities/EnemyActor.ts', import.meta.url), 'utf8')

test('劫持浮游体使用仿企业浮空艇节奏的12帧透明飞行动画', async () => {
  const asset = new URL('enemy-07-hijack-hovercraft-fly.webp', root)
  assert.equal(existsSync(asset), true)
  const metadata = await sharp(fileURLToPath(asset), { animated: true }).metadata()
  assert.equal(metadata.pages, 12)
  assert.equal(metadata.pageHeight, 512)
  assert.deepEqual(metadata.delay, Array(12).fill(67))
  assert.equal(metadata.hasAlpha, true)
})

test('劫持浮游体动画已接入游戏数据、生图工作台和运行时逐帧播放', () => {
  assert.match(enemies, /enemy-07-hijack-hovercraft-fly\.webp\?v=generated-flight-20260825/)
  assert.match(catalog, /hijacker:'\/assets\/animations\/enemies\/enemy-07-hijack-hovercraft-fly\.webp/)
  assert.match(preload, /enemy-hijacker-fly-\$\{suffix\}/)
  assert.match(actor, /ENEMY_RUNTIME_ANIMATIONS\[this\.enemy\.typeId\]/)
  assert.match(actor, /this\.playMotion\('move'\)/)
})

test('运行时所需的12张透明帧均存在', () => {
  for (let frame = 1; frame <= 12; frame += 1) {
    const suffix = String(frame).padStart(2, '0')
    assert.equal(existsSync(new URL(`enemy-07-hijack-hovercraft-fly-frames/frame-${suffix}.png`, root)), true)
  }
})
test('游戏运行时直接加载完整身体的 PNG 帧，避免 WebP 差分帧损坏主体', async () => {
  for (const motion of ['move', 'attack'] as const) {
    for (let frame = 1; frame <= 12; frame += 1) {
      const relative = enemyAnimationFramePath('hijacker', motion, frame)
      assert.match(relative, /enemy-07-hijack-hovercraft-fly-frames\/frame-\d{2}\.png$/)
      const file = new URL(../public/, import.meta.url)
      const { data } = await sharp(fileURLToPath(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      let visiblePixels = 0
      for (let index = 3; index < data.length; index += 4) if (data[index] > 16) visiblePixels += 1
      assert.ok(visiblePixels > 80_000, ${motion} frame  lost the vehicle body)
    }
  }
})
