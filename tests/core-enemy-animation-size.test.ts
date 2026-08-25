import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const assets = [
  { id: 'gang', file: 'enemy-01-gang-cyborg-side45-move-fixed-size.webp', pages: 8 },
  { id: 'riot', file: 'enemy-02-riot-mech-move-fixed-size.webp', pages: 8 },
  { id: 'ninja', file: 'enemy-03-phase-ninja-move-fixed-size.webp', pages: 8 },
]
const root = new URL('../public/assets/animations/enemies/', import.meta.url)
const enemies = readFileSync(new URL('../src/data/enemies.ts', import.meta.url), 'utf8')
const catalog = readFileSync(new URL('../src/data/animationCatalog.ts', import.meta.url), 'utf8')
const generator = readFileSync(new URL('../tools/normalize-core-enemy-animation-size.mjs', import.meta.url), 'utf8')

test('core enemy move animations use fixed-size transparent assets', async () => {
  for (const asset of assets) {
    const url = new URL(asset.file, root)
    assert.equal(existsSync(url), true)
    const metadata = await sharp(fileURLToPath(url), { animated: true }).metadata()
    assert.equal(metadata.pages, asset.pages)
    assert.equal(metadata.pageHeight, 512)
    assert.equal(metadata.hasAlpha, true)
  }
})

test('each animation computes one fixed character scale instead of per-frame zoom', () => {
  assert.match(generator, /const fixedScale = job\.targetMaxHeight \/ sourceMaxHeight/)
  assert.match(generator, /bounds\.width \* fixedScale/)
  assert.match(generator, /bounds\.height \* fixedScale/)
  assert.doesNotMatch(generator, /job\.targetMaxHeight \/ bounds\.height/)
})

test('runtime data and animation studio reference the fixed-size assets', () => {
  for (const asset of assets) {
    const escaped = asset.file.replace(/\./g, '\\.')
    assert.match(enemies, new RegExp(escaped))
    assert.match(catalog, new RegExp(escaped))
  }
})
