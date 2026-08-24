import fs from 'node:fs'
const file='src/data/animationCatalog.ts'
let s=fs.readFileSync(file,'utf8')
const old=`export const ANIMATION_CATALOG: readonly AnimationCatalogEntry[]=[...towerForms.map(tower),...enemies,...units,...systems]`
const replacement=`const towerAttackForms = towerForms.filter((form) => form.family !== '街头兵营' && form.family !== '无人机巢')

export const ANIMATION_CATALOG: readonly AnimationCatalogEntry[]=[...towerAttackForms.map(tower),...enemies,...units,...systems]`
if(!s.includes(old)) throw new Error('catalog export not found')
s=s.replace(old,replacement)
fs.writeFileSync(file,s,'utf8')

const testFile='tests/animation-catalog.test.ts'
s=fs.readFileSync(testFile,'utf8')
s=s.replace(`test('动画面板覆盖八种塔全部等级共40种攻击形态', () => {`, `test('动画面板只收录具有本体攻击的六种塔，共30种攻击形态', () => {`)
s=s.replace(`  assert.equal(towers.length, 40)`, `  assert.equal(towers.length, 30)`)
s=s.replace(`  assert.equal(families.size, 8)`, `  assert.equal(families.size, 6)`)
s=s.replace(`  assert.equal(ANIMATION_CATALOG.length, 99)`, `  assert.equal(ANIMATION_CATALOG.length, 89)`)
s=s.replace(`  assert.equal(new Set(ANIMATION_CATALOG.map((entry) => entry.id)).size, 99)`, `  assert.equal(new Set(ANIMATION_CATALOG.map((entry) => entry.id)).size, 89)`)
const oldTest=`test('街头兵营与无人机巢没有塔体攻击动画，目录统一描述为单位部署', () => {
  assert.equal(TOWER_TYPE_BY_ID['street-mercenary'].attackAnimation, undefined)
  assert.equal(TOWER_TYPE_BY_ID['drone-hive'].attackAnimation, undefined)
  for (const family of ['街头兵营', '无人机巢']) {
    const entries = ANIMATION_CATALOG.filter((entry) => entry.category === 'tower' && entry.family === family)
    assert.equal(entries.length, 5)
    assert.ok(entries.every((entry) => entry.action === '部署'))
    assert.ok(entries.every((entry) => entry.description.includes('本体保持待机')))
  }
})`
const newTest=`test('街头兵营与无人机巢本身没有攻击动画，只保留佣兵和无人机单位动画', () => {
  assert.equal(TOWER_TYPE_BY_ID['street-mercenary'].attackAnimation, undefined)
  assert.equal(TOWER_TYPE_BY_ID['drone-hive'].attackAnimation, undefined)
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'tower' && entry.family === '街头兵营').length, 0)
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'tower' && entry.family === '无人机巢').length, 0)
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'mercenary').length, 9)
  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'drone').length, 9)
})`
if(!s.includes(oldTest)) throw new Error('old animation test not found')
s=s.replace(oldTest,newTest)
fs.writeFileSync(testFile,s,'utf8')
