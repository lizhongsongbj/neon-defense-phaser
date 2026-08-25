import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ALL_TOWER_TYPES, EXPANSION_TOWER_IDS } from '../src/data/towerExpansion'

const hud = readFileSync(new URL('../src/ui/BattleHud.ts', import.meta.url), 'utf8')
const preload = readFileSync(new URL('../src/scenes/PreloadScene.ts', import.meta.url), 'utf8')
const resolver = readFileSync(new URL('../src/systems/towerBehaviors/index.ts', import.meta.url), 'utf8')
const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')

test('all eight tower definitions are available to the mission loadout and battle picker', () => {
  assert.equal(ALL_TOWER_TYPES.length, 8)
  assert.equal(new Set(ALL_TOWER_TYPES.map((tower) => tower.id)).size, 8)
  for (const id of EXPANSION_TOWER_IDS) assert.ok(ALL_TOWER_TYPES.some((tower) => tower.id === id))
  assert.match(hud, /ALL_TOWER_TYPES.filter/)
})

test('expansion tower textures and combat resolvers are connected to battle runtime', () => {
  assert.ok(preload.includes('for (const tower of ALL_TOWER_TYPES)'))
  assert.match(resolver, /EXPANSION_TOWER_IDS/)
  assert.match(resolver, /resolveExpansionTower/)
  assert.ok(battle.includes('ALL_TOWER_TYPE_BY_ID[typeId]'))
})
