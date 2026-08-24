import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EXPANSION_BALANCE_RULES,
  EXPANSION_TOWERS,
  SYNERGY_ATTACKS,
  TIER4_BRANCHES,
  type AllTowerId,
} from '../src/data/towerExpansion'
import { TOWER_IDS } from '../src/data/towers'

test('三种扩展塔均包含完整的1-3级正数数值', () => {
  assert.equal(EXPANSION_TOWERS.length, 3)
  for (const tower of EXPANSION_TOWERS) {
    assert.ok(tower.buildCost > 0)
    assert.deepEqual(tower.levels.map((level) => level.level), [1, 2, 3])
    for (const level of tower.levels) {
      assert.ok(level.range > 0)
      assert.ok(level.cooldown > 0)
      assert.ok(level.damage > 0)
      assert.ok(level.targetCount > 0)
    }
  }
})

test('八种塔各有两个第四级分支且总数为16', () => {
  const allTowerIds: AllTowerId[] = [...TOWER_IDS, ...EXPANSION_TOWERS.map((tower) => tower.id)]
  assert.equal(allTowerIds.length, 8)
  assert.equal(TIER4_BRANCHES.length, 16)
  assert.equal(new Set(TIER4_BRANCHES.map((branch) => branch.id)).size, 16)
  for (const towerId of allTowerIds) {
    const branches = TIER4_BRANCHES.filter((branch) => branch.towerId === towerId)
    assert.equal(branches.length, EXPANSION_BALANCE_RULES.tier4BranchesPerTower)
    assert.deepEqual(new Set(branches.map((branch) => branch.branch)), new Set(['A', 'B']))
    for (const branch of branches) {
      assert.ok(branch.upgradeCost > 0)
      assert.ok(branch.stats.range > 0)
      assert.ok(branch.stats.cooldown > 0)
      assert.ok(branch.stats.damage >= 0)
      assert.ok(branch.stats.targetCount > 0)
    }
  }
})

test('连携系统包含4种普通连携与2种终极连携', () => {
  const normal = SYNERGY_ATTACKS.filter((synergy) => synergy.tier === 'normal')
  const ultimate = SYNERGY_ATTACKS.filter((synergy) => synergy.tier === 'ultimate')
  assert.equal(normal.length, 4)
  assert.equal(ultimate.length, 2)
  assert.equal(new Set(SYNERGY_ATTACKS.map((synergy) => synergy.id)).size, 6)

  const normalTowerIds = normal.flatMap((synergy) => synergy.towers)
  assert.equal(normalTowerIds.length, 8)
  assert.equal(new Set(normalTowerIds).size, 8)

  const firstUltimate = new Set(ultimate[0].towers)
  assert.ok(ultimate[1].towers.every((towerId) => !firstUltimate.has(towerId)))
  for (const synergy of SYNERGY_ATTACKS) {
    assert.ok(synergy.triggerWindow > 0)
    assert.ok(synergy.internalCooldown > 0)
    assert.ok(synergy.targetCount > 0)
  }
})

test('扩展防御塔在游戏中只显示正式名称，不附加设计版本文字', () => {
  assert.deepEqual(
    EXPANSION_TOWERS.map((tower) => tower.name),
    ['重力钉', '灰潮解构站', '轨迹回写器'],
  )
  for (const tower of EXPANSION_TOWERS) {
    assert.equal(tower.name.includes('·'), false)
    assert.equal(tower.name.includes('简化版'), false)
    assert.equal(tower.name.includes('重制版'), false)
  }
})
