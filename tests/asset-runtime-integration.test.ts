import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { TOWER_LEVEL_IMAGE, TOWER_ATTACK_FRAMES } from '../src/data/towerVisuals'
import { UNIT_RUNTIME_FRAMES, UNIT_RUNTIME_MOTIONS } from '../src/data/unitRuntimeAnimations'
import { ANIMATION_CATALOG } from '../src/data/animationCatalog'

const publicFile = (relative: string) => new URL(`../public/${relative.replace(/^\//, '')}`, import.meta.url)

test('all tower level visuals exist', () => {
  for (const [towerId, images] of Object.entries(TOWER_LEVEL_IMAGE)) {
    assert.equal(images.length, 3, `${towerId} should have three level visuals`)
    images.forEach((image) => assert.equal(existsSync(publicFile(image)), true, image))
  }
})

test('tower attack frames are extracted and wired into battle', () => {
  for (const [towerId, count] of Object.entries(TOWER_ATTACK_FRAMES)) {
    for (let frame = 1; frame <= (count ?? 0); frame += 1) {
      const file = `assets/animations/towers/runtime/${towerId}/attack/frame-${String(frame).padStart(2, '0')}.png`
      assert.equal(existsSync(publicFile(file)), true, file)
    }
  }
  const actor = readFileSync(new URL('../src/entities/TowerActor.ts', import.meta.url), 'utf8')
  const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')
  assert.match(actor, /attackSprite\.play\(animationKey/)
  assert.match(battle, /this\.towerActors\.get\(tower\.id\)\?\.playAttackFeedback\(\)/)
})

test('all mercenary and drone motion frames exist and catalog has no planned gap', () => {
  for (const [unitId, motions] of Object.entries(UNIT_RUNTIME_MOTIONS)) {
    for (const motion of motions) {
      for (let frame = 1; frame <= UNIT_RUNTIME_FRAMES; frame += 1) {
        const file = `assets/animations/units/runtime/${unitId}/${motion}/frame-${String(frame).padStart(2, '0')}.png`
        assert.equal(existsSync(publicFile(file)), true, file)
      }
    }
  }
  assert.deepEqual(ANIMATION_CATALOG.filter((entry) => entry.status === 'planned').map((entry) => entry.id), [])
})

test('special enemy attacks and arc frames are used at runtime', () => {
  const enemyActor = readFileSync(new URL('../src/entities/EnemyActor.ts', import.meta.url), 'utf8')
  const effects = readFileSync(new URL('../src/entities/EffectsLayer.ts', import.meta.url), 'utf8')
  const preload = readFileSync(new URL('../src/scenes/PreloadScene.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(enemyActor, /SOLID_ATTACK_IDS/)
  assert.match(enemyActor, /playMotion\(attackActive \? 'attack' : 'move'\)/)
  assert.match(preload, /fx-arc-lightning-/)
  assert.match(effects, /fx-arc-lightning-discharge/)
})
