import test from 'node:test'
import assert from 'node:assert/strict'
import { MAP_LEVELS } from '../src/data/maps'
import { buildMapGeometry, routePoint } from '../src/systems/PathSystem'
import { spawnEnemy } from '../src/systems/CombatSystem'
import { resolveDroneHive } from '../src/systems/towerBehaviors/DroneHive'
import type { EnemyState, TowerState } from '../src/systems/types'
import { readFileSync } from 'node:fs'

const actorSource = readFileSync(new URL('../src/entities/DroneSquadActor.ts', import.meta.url), 'utf8')
const battleSource = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')

const geometry = buildMapGeometry(MAP_LEVELS[4])
const stationPoint = routePoint(geometry, 500, 'left')
const station = { x: stationPoint.x, y: stationPoint.y }

function makeEnemy(id: number, type: 'gang' | 'aerostat' | 'hijacker'): EnemyState {
  const enemy = spawnEnemy({
    id,
    mapIndex: 4,
    wave: 1,
    difficulty: 'normal',
    now: 0,
    entry: { type, boss: false, lane: 'left', routeIndex: 0, delay: 0 },
  })
  enemy.distance = 500
  return enemy
}

function makeTower(): TowerState {
  return {
    id: 'drone-test', typeId: 'drone-hive', slotIndex: 0, source: station,
    rangeScale: 1, level: 1, spent: 135, cooldown: 0, targetId: null,
    rallyPoint: station, mercs: null, damageDealt: 0, utility: 0, attacks: 0,
  }
}

test('无人机驻守道路并攻击经过的地面怪物', () => {
  const gang = makeEnemy(1, 'gang')
  const events = resolveDroneHive(makeTower(), {
    geometry, enemies: [gang], dt: 1, now: 1000, growth: { damage: 1, range: 1 },
  })
  assert.equal(events.length, 2)
  assert.equal(events.every((event) => event.targetId === gang.id), true)
  assert.ok(gang.hp < gang.maxHp)
  assert.equal(gang.blocked, false, '地面怪物只会被攻击，不会被无人机拦停')
})

test('无人机只拦截劫持浮游体和企业浮空艇', () => {
  const gang = makeEnemy(1, 'gang')
  const aerostat = makeEnemy(2, 'aerostat')
  const hijacker = makeEnemy(3, 'hijacker')
  resolveDroneHive(makeTower(), {
    geometry, enemies: [gang, aerostat, hijacker], dt: 1, now: 1000, growth: { damage: 1, range: 1 },
  })
  assert.equal(gang.blocked, false)
  assert.equal(aerostat.blocked, true)
  assert.equal(hijacker.blocked, true)
})

test('无人机从塔内飞到最近道路驻守，出击后返回驻守点而不是塔内', () => {
  assert.match(battleSource, /findNearestRoutePoint\(this\.geometry, tower\.source\)/)
  assert.match(battleSource, /actor\.sync\(home\.x, home\.y, station\.x, station\.y/)
  assert.match(actorSource, /if \(!this\.deployed\)/)
  assert.match(actorSource, /this\.stationCenter/)
  assert.match(actorSource, /const station = this\.stationPosition\(slot\)/)
})
