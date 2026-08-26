import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ANIMATION_CATALOG } from '../src/data/animationCatalog'
import { ENEMY_RUNTIME_ANIMATIONS, enemyAnimationFramePath } from '../src/data/enemyRuntimeAnimations'

const root = new URL('../public/assets/animations/enemies/', import.meta.url)
const generator = readFileSync(new URL('../tools/generate-eve-9-move-animation.mjs', import.meta.url), 'utf8')

test('夏娃-9使用参考企业浮空艇节奏的12帧透明移动动画', async () => {
  const asset = new URL('boss-eve-9-move.webp', root)
  assert.equal(existsSync(asset), true)
  const metadata = await sharp(fileURLToPath(asset), { animated: true }).metadata()
  assert.equal(metadata.pages, 12)
  assert.equal(metadata.pageHeight, 512)
  assert.deepEqual(metadata.delay, Array(12).fill(67))
  assert.equal(metadata.hasAlpha, true)
})

test('夏娃-9移动动画已接入动画面板和战斗运行时', () => {
  const move = ANIMATION_CATALOG.find((entry) => entry.id === 'eve-fly')
  assert.equal(move?.status, 'available')
  assert.equal(move?.motion, 'fly')
  assert.match(move?.previewAsset ?? '', /boss-eve-9-move\.webp/)
  assert.deepEqual(ENEMY_RUNTIME_ANIMATIONS.eve.move, {
    source: 'boss-eve-9-move.webp', frames: 12, frameRate: 15, repeat: -1,
  })
})

test('夏娃-9运行时12帧均存在且生成流程保留透明背景', async () => {
  assert.match(generator, /background: \{ r: 0, g: 0, b: 0, alpha: 0 \}/)
  for (let frame = 1; frame <= 12; frame += 1) {
    const relative = enemyAnimationFramePath('eve', 'move', frame)
    const url = new URL(`../public/${relative}`, import.meta.url)
    assert.equal(existsSync(url), true)
    const metadata = await sharp(fileURLToPath(url)).metadata()
    assert.equal(metadata.hasAlpha, true)
    assert.equal(metadata.width, 512)
    assert.equal(metadata.height, 512)
  }
})
