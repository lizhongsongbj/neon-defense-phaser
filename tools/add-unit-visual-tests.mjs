import fs from 'node:fs'
let file='tests/animation-catalog.test.ts'
let s=fs.readFileSync(file,'utf8')
s=s.replace(`import { ANIMATION_CATALOG } from '../src/data/animationCatalog'`, `import { ANIMATION_CATALOG } from '../src/data/animationCatalog'\nimport { TOWER_TYPE_BY_ID } from '../src/data/towers'`)
s += `

test('街头兵营与无人机巢没有塔体攻击动画，目录统一描述为单位部署', () => {
  assert.equal(TOWER_TYPE_BY_ID['street-mercenary'].attackAnimation, undefined)
  assert.equal(TOWER_TYPE_BY_ID['drone-hive'].attackAnimation, undefined)
  for (const family of ['街头兵营', '无人机巢']) {
    const entries = ANIMATION_CATALOG.filter((entry) => entry.category === 'tower' && entry.family === family)
    assert.equal(entries.length, 5)
    assert.ok(entries.every((entry) => entry.action === '部署'))
    assert.ok(entries.every((entry) => entry.description.includes('本体保持待机')))
  }
})
`
fs.writeFileSync(file,s,'utf8')
