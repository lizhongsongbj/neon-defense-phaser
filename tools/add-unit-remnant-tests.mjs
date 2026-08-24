import fs from 'node:fs'
const file='tests/effect-catalog.test.ts'
let s=fs.readFileSync(file,'utf8')
s += `

test('佣兵死亡使用血迹残留，无人机死亡使用零件残留', () => {
  const mercDeaths = EFFECT_CATALOG.filter((entry) => entry.category === 'mercenary-death')
  const droneDeaths = EFFECT_CATALOG.filter((entry) => entry.category === 'drone-death')
  assert.ok(mercDeaths.every((entry) => entry.remnantAsset?.endsWith('/biological-blood-puddle.png')))
  assert.ok(mercDeaths.every((entry) => entry.layers.includes('血迹残留')))
  assert.ok(droneDeaths.every((entry) => entry.remnantAsset?.endsWith('/mechanical-parts-pile.png')))
  assert.ok(droneDeaths.every((entry) => entry.layers.includes('零件残留')))
})
`
fs.writeFileSync(file,s,'utf8')
