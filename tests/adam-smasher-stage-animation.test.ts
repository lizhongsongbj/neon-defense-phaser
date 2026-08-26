import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { ANIMATION_CATALOG } from '../src/data/animationCatalog'
import { ENEMY_RUNTIME_ANIMATIONS, enemyAnimationFramePath } from '../src/data/enemyRuntimeAnimations'

const animationRoot = new URL('../public/assets/animations/enemies/', import.meta.url)
const actor = readFileSync(new URL('../src/entities/EnemyActor.ts', import.meta.url), 'utf8')

for (const stage of [2, 3] as const) {
  for (const motion of ['move', 'attack'] as const) {
    test(`亚当·重锤${stage}级${motion}动画包含8帧透明素材`, async () => {
      const preview = new URL(`boss-adam-smasher-stage-${stage}-${motion}.webp`, animationRoot)
      assert.equal(existsSync(preview), true)
      const previewMeta = await sharp(fileURLToPath(preview), { animated: true }).metadata()
      assert.equal(previewMeta.pages, 8)
      assert.equal(previewMeta.width, 512)
      assert.equal(previewMeta.pageHeight, 512)
      assert.equal(previewMeta.hasAlpha, true)

      const runtimeId = `enforcer-stage-${stage}`
      const spec = ENEMY_RUNTIME_ANIMATIONS[runtimeId]?.[motion]
      assert.equal(spec?.frames, 8)
      for (let frame = 1; frame <= 8; frame += 1) {
        const framePath = new URL(`../public/${enemyAnimationFramePath(runtimeId, motion, frame)}`, import.meta.url)
        assert.equal(existsSync(framePath), true)
        const metadata = await sharp(fileURLToPath(framePath)).metadata()
        assert.equal(metadata.width, 512)
        assert.equal(metadata.height, 512)
        assert.equal(metadata.hasAlpha, true)
      }
    })
  }
}

test('动画工作台展示亚当·重锤三形态的行走和攻击动画', () => {
  const entries = ANIMATION_CATALOG.filter((entry) => entry.family === '亚当·重锤')
  assert.equal(entries.length, 6)
  assert.deepEqual(new Set(entries.map((entry) => entry.level)), new Set(['初始形态', '二级形态', '三级形态']))
  assert.ok(entries.every((entry) => entry.status === 'available'))
  assert.ok(entries.every((entry) => entry.previewAsset?.includes('.webp')))
})

test('战斗运行时按Boss当前阶段选择亚当·重锤动画', () => {
  assert.match(actor, /animationTypeId\(\)/)
  assert.match(actor, /`\$\{this\.enemy\.typeId\}-stage-\$\{this\.enemy\.stage\}`/)
  assert.match(actor, /ENEMY_RUNTIME_ANIMATIONS\[this\.animationTypeId\(\)\]\?\.move/)
  assert.match(actor, /this\.currentAnimationTypeId === typeId/)
})
