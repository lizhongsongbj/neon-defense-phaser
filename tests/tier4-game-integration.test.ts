import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { TIER4_BRANCHES, TIER4_BRANCH_IMAGE_BY_ID, tier4BranchesForTower, GROWTH_TOWER_IDS } from '../src/data/towerExpansion'

const battleScene = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')
const battleHud = readFileSync(new URL('../src/ui/BattleHud.ts', import.meta.url), 'utf8')

test('八种防御塔各有两条可用的四级分支和塔身图片', () => {
  assert.equal(TIER4_BRANCHES.length, 16)
  for (const towerId of GROWTH_TOWER_IDS) {
    const branches = tier4BranchesForTower(towerId)
    assert.equal(branches.length, 2)
    assert.deepEqual(new Set(branches.map((branch) => branch.branch)), new Set(['A', 'B']))
    for (const branch of branches) {
      const image = TIER4_BRANCH_IMAGE_BY_ID[branch.id]
      assert.ok(image)
      assert.equal(existsSync(fileURLToPath(new URL(`../public/${image}`, import.meta.url))), true, `${branch.name} 图片缺失`)
    }
  }
})

test('战斗升级流程允许三级塔选择分支并升到四级', () => {
  assert.match(battleScene, /maxLevel: 4/)
  assert.match(battleScene, /tower\.level >= 4/)
  assert.match(battleScene, /TIER4_BRANCH_BY_ID\[payload\.branchId/)
  assert.match(battleScene, /tower\.tier4BranchId = branch\?\.id/)
  assert.match(battleHud, /tower-tier4-branch/)
  assert.match(battleHud, /branchId: choice\.id/)
})
