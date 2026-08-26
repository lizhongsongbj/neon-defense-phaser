import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const hud = readFileSync(new URL('../src/ui/BattleHud.ts', import.meta.url), 'utf8')
const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')

test('selected tower upgrade controls refresh whenever battle coins change', () => {
  assert.match(hud, /this\.currentTowerInfo\.coins\s*=\s*payload\.coins/)
  assert.match(hud, /this\.refreshUpgradeButton\(payload\.coins\)/)
})

test('upgrade requests stay clickable and always return visible success or failure feedback', () => {
  assert.match(hud, /this\.upgradeBtn\.disabled\s*=\s*false/)
  assert.match(hud, /还差 \$\{deficit\}/)
  assert.match(battle, /金币不足 · 还差/)
  assert.match(battle, /已升级至 LV\./)
})