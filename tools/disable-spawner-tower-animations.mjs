import fs from 'node:fs'
let file='src/data/towers.ts'
let s=fs.readFileSync(file,'utf8')
s=s.replace(`  attackAnimation: string`, `  attackAnimation?: string`)
s=s.replace(`    attackAnimation: 'assets/animations/towers/tower-05-drone-hive-attack.webp',\n`, '')
s=s.replace(`    attackAnimation: 'assets/animations/towers/tower-03-mercenary-outpost-attack.webp',\n`, '')
fs.writeFileSync(file,s,'utf8')

file='src/data/animationCatalog.ts'
s=fs.readFileSync(file,'utf8')
const old=`const tower = (form: TowerForm): AnimationCatalogEntry => ({
  ...form,
  category: 'tower',
  action: '攻击',
  description: \`\${form.name}发动“\${form.attack}”。动作轮廓、蓄能方式和打击反馈必须直接对应名称与战斗定位。\`,
  referenceImage: form.image,
  status: form.previewAsset ? 'available' : 'planned',
  tags: [form.family, form.level, form.attack],
})`
const replacement=`const tower = (form: TowerForm): AnimationCatalogEntry => {
  const unitSpawner = form.family === '街头兵营' || form.family === '无人机巢'
  return {
    ...form,
    category: 'tower',
    action: unitSpawner ? '部署' : '攻击',
    description: unitSpawner
      ? \`\${form.name}本体保持待机，战斗表现完全由\${form.family === '街头兵营' ? '佣兵小队' : '无人机编队'}的出动与攻击承担。\`
      : \`\${form.name}发动“\${form.attack}”。动作轮廓、蓄能方式和打击反馈必须直接对应名称与战斗定位。\`,
    referenceImage: form.image,
    status: form.previewAsset ? 'available' : 'planned',
    tags: [form.family, form.level, form.attack],
  }
}`
if(!s.includes(old)) throw new Error('tower helper not found')
s=s.replace(old,replacement)
s=s.replace(`,previewAsset:'/assets/animations/towers/tower-03-mercenary-outpost-attack.webp'`, '')
s=s.replace(`,previewAsset:'/assets/animations/towers/tower-05-drone-hive-attack.webp'`, '')
s=s.replaceAll(`timeline:'警示灯亮起 → 正门开启 → 两名佣兵冲出 → 掩体火力闪光'`, `timeline:'塔体保持静止 → 佣兵在集结点接敌 → 小队成员独立开火 → 命中反馈'`)
s=s.replaceAll(`timeline:'舱门打开 → 两机垂直升空 → 锁定目标 → 双发俯冲攻击'`, `timeline:'巢体保持静止 → 两架无人机离巢 → 分别锁定目标 → 俯冲攻击后返航'`)
fs.writeFileSync(file,s,'utf8')
