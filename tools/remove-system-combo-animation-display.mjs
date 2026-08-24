import fs from 'node:fs'

const catalogFile='src/data/animationCatalog.ts'
let s=fs.readFileSync(catalogFile,'utf8')
s=s.replace(`export type AnimationCategory = 'tower' | 'enemy' | 'mercenary' | 'drone' | 'system'`, `export type AnimationCategory = 'tower' | 'enemy' | 'mercenary' | 'drone'`)
const start=s.indexOf('const systemSpecs=[')
const end=s.indexOf('const towerAttackDisabledFamilies', start)
if(start<0||end<0) throw new Error('system animation block not found')
s=s.slice(0,start)+s.slice(end)
s=s.replace(`export const ANIMATION_CATALOG: readonly AnimationCatalogEntry[]=[...towerAttackForms.map(tower),...enemies,...units,...systems]`, `export const ANIMATION_CATALOG: readonly AnimationCatalogEntry[]=[...towerAttackForms.map(tower),...enemies,...units]`)
s=s.replace(`export const ANIMATION_CATEGORY_LABEL:Record<AnimationCategory,string>={tower:'防御塔攻击',enemy:'怪物动画',mercenary:'佣兵动画',drone:'无人机动画',system:'系统与连携'}`, `export const ANIMATION_CATEGORY_LABEL:Record<AnimationCategory,string>={tower:'防御塔攻击',enemy:'怪物动画',mercenary:'佣兵动画',drone:'无人机动画'}`)
fs.writeFileSync(catalogFile,s,'utf8')

const htmlFile='index.html'
s=fs.readFileSync(htmlFile,'utf8')
s=s.replace('收录保留攻击表现的防御塔动画、全部怪物行走/攻击/死亡、佣兵和无人机单位动作，以及系统与连携特效。','收录保留攻击表现的防御塔动画、全部怪物行走/攻击/死亡，以及佣兵和无人机单位动作。')
s=s.replace('<button type="button" data-animation-filter="system" aria-pressed="false">系统/连携</button>','')
fs.writeFileSync(htmlFile,s,'utf8')

const testFile='tests/animation-catalog.test.ts'
s=fs.readFileSync(testFile,'utf8')
s=s.replace(`test('佣兵、无人机和系统连携动画定义完整', () => {`, `test('动画面板只展示佣兵和无人机单位动画，不展示系统与连携', () => {`)
s=s.replace(`  assert.equal(ANIMATION_CATALOG.filter((entry) => entry.category === 'system').length, 14)\n  assert.equal(ANIMATION_CATALOG.length, 74)\n  assert.equal(new Set(ANIMATION_CATALOG.map((entry) => entry.id)).size, 74)`, `  assert.equal(ANIMATION_CATALOG.some((entry) => String(entry.category) === 'system'), false)\n  assert.equal(ANIMATION_CATALOG.length, 60)\n  assert.equal(new Set(ANIMATION_CATALOG.map((entry) => entry.id)).size, 60)`)
fs.writeFileSync(testFile,s,'utf8')
