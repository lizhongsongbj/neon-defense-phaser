import fs from 'node:fs'
const file='src/entities/EffectsLayer.ts'
let s=fs.readFileSync(file,'utf8')
const start=s.indexOf(`    if (effect === 'drone' && this.scene.textures.exists('unit-drone-hive')) {`)
if(start<0) throw new Error('drone branch not found')
const endMarker=`      return\n    }`
const end=s.indexOf(endMarker,start)
if(end<0) throw new Error('drone branch end not found')
s=s.slice(0,start)+s.slice(end+endMarker.length)
s=s.replace(` * 这里用 Phaser Graphics + Tween 简化重现:一条飞行的短线 + 命中处的扩散圆环。`, ` * 塔楼本体只为磁轨、电弧和黑客攻击提供发射点；佣兵与无人机由各自单位演员负责出动。`)
fs.writeFileSync(file,s,'utf8')
