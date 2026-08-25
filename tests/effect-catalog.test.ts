import test from 'node:test'
import assert from 'node:assert/strict'
import { EFFECT_CATALOG } from '../src/data/effectCatalog'

test('特效面板覆盖通用、连携与三类死亡特效', () => {
  assert.equal(EFFECT_CATALOG.length, 39)
  assert.equal(new Set(EFFECT_CATALOG.map((entry) => entry.id)).size, 39)
  assert.equal(EFFECT_CATALOG.filter((entry) => entry.category === 'core').length, 15)
  assert.equal(EFFECT_CATALOG.filter((entry) => entry.category === 'synergy').length, 6)
  assert.equal(EFFECT_CATALOG.filter((entry) => entry.category === 'enemy-death').length, 12)
  assert.equal(EFFECT_CATALOG.filter((entry) => entry.category === 'mercenary-death').length, 3)
  assert.equal(EFFECT_CATALOG.filter((entry) => entry.category === 'drone-death').length, 3)
})

test('每个特效均包含可预演的颜色、时间线和合成层', () => {
  for (const entry of EFFECT_CATALOG) {
    assert.match(entry.accent, /^#[0-9a-f]{6}$/i)
    assert.match(entry.secondary, /^#[0-9a-f]{6}$/i)
    assert.ok(entry.description.length > 8)
    assert.ok(entry.timeline.includes('→'))
    assert.ok(entry.layers.length >= 3)
  }
})

test('连携、怪物、佣兵和无人机死亡特效全部收录', () => {
  const synergyNames = EFFECT_CATALOG.filter((entry) => entry.category === 'synergy').map((entry) => entry.name)
  assert.deepEqual(synergyNames, ['超载坍缩','零日穿透','铬街收割','蜂群回声','城市断电协议','断点猎杀'])
  assert.ok(EFFECT_CATALOG.some((entry) => entry.name === '夏娃-9死亡'))
  assert.ok(EFFECT_CATALOG.some((entry) => entry.name === '铬钢盾兵倒地'))
  assert.ok(EFFECT_CATALOG.some((entry) => entry.name === '蜂后指挥机断链'))
})


test('黑客中继塔头脉冲已登记到特效面板', () => {
  const pulse = EFFECT_CATALOG.find((entry) => entry.id === 'fx-hacker-head-pulse')
  assert.equal(pulse?.category, 'core')
  assert.equal(pulse?.motion, 'shockwave')
  assert.equal(pulse?.accent, '#79ff9e')
  assert.equal(pulse?.secondary, '#c9ffe0')
  assert.ok(pulse?.layers.includes('塔头能量核'))
})


test('佣兵死亡使用血迹残留，无人机死亡使用零件残留', () => {
  const mercDeaths = EFFECT_CATALOG.filter((entry) => entry.category === 'mercenary-death')
  const droneDeaths = EFFECT_CATALOG.filter((entry) => entry.category === 'drone-death')
  assert.ok(mercDeaths.every((entry) => entry.remnantAsset?.endsWith('/biological-blood-puddle.png')))
  assert.ok(mercDeaths.every((entry) => entry.layers.includes('血迹残留')))
  assert.ok(droneDeaths.every((entry) => entry.remnantAsset?.endsWith('/mechanical-parts-pile.png')))
  assert.ok(droneDeaths.every((entry) => entry.layers.includes('零件残留')))
})


test('enemy death effects include biological blood and mechanical parts remnants', () => {
  const enemyDeaths = EFFECT_CATALOG.filter((entry) => entry.category === 'enemy-death')
  const biological = enemyDeaths.filter((entry) => entry.remnantAsset?.endsWith('/biological-blood-puddle.png'))
  const mechanical = enemyDeaths.filter((entry) => entry.remnantAsset?.endsWith('/mechanical-parts-pile.png'))
  assert.equal(biological.length, 5)
  assert.equal(mechanical.length, 7)
  assert.ok(biological.every((entry) => entry.layers.includes('\u8840\u8ff9\u6b8b\u7559')))
  assert.ok(mechanical.every((entry) => entry.layers.includes('\u96f6\u4ef6\u6b8b\u7559')))
})
