import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const animationRoot = new URL('../public/assets/animations/enemies/', import.meta.url)
const runtime = readFileSync(new URL('../src/data/enemyRuntimeAnimations.ts', import.meta.url), 'utf8')
const catalog = readFileSync(new URL('../src/data/animationCatalog.ts', import.meta.url), 'utf8')
const actor = readFileSync(new URL('../src/entities/EnemyActor.ts', import.meta.url), 'utf8')

for (const motion of ['move', 'attack', 'death'] as const) {
  test(`亚当·重锤${motion}动画包含8帧固定尺寸透明素材`, async () => {
    const preview = new URL(`boss-adam-smasher-${motion}.webp`, animationRoot)
    assert.equal(existsSync(preview), true)
    const metadata = await sharp(fileURLToPath(preview), { animated: true }).metadata()
    assert.equal(metadata.pages, 8)
    assert.equal(metadata.pageHeight, 512)
    assert.equal(metadata.hasAlpha, true)
    for (let frame = 1; frame <= 8; frame += 1) {
      const suffix = String(frame).padStart(2, '0')
      assert.equal(existsSync(new URL(`runtime/enforcer/${motion}/frame-${suffix}.webp`, animationRoot)), true)
    }
  })
}

test('亚当·重锤动画已接入素材生图工作台和Boss运行时', () => {
  assert.match(catalog, /boss-adam-smasher-move\.webp/)
  assert.match(catalog, /boss-adam-smasher-attack\.webp/)
  assert.match(catalog, /boss-adam-smasher-death\.webp/)
  assert.match(runtime, /enforcer:/)
  assert.match(runtime, /boss-adam-smasher-move\.webp/)
  assert.match(actor, /animationTypeId\(\)/)
  assert.match(actor, /playExitAnimation/)
})

