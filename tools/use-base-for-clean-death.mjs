import fs from 'node:fs'
const p='src/data/animationCatalog.ts'; let s=fs.readFileSync(p,'utf8')
for(const [id,asset] of Object.entries({aerostat:"'/assets/enemies/corporate-aerostat.png'",devourer:"'/assets/enemies/data-devourer.png'",faraday:"'/assets/enemies/new/enemy-06-faraday-suppressor.png'",hijacker:"'/assets/enemies/new/enemy-07-hijack-hovercraft.png'"})){
 const re=new RegExp(`${id}:'.*?'`)
 // only replace in deathAssets line by targeted old path segment
}
s=s.replace("aerostat:'/assets/animations/enemies/runtime/aerostat/death/frame-01.webp?v=generated-actions-20260826'", "aerostat:'/assets/enemies/corporate-aerostat.png?v=clean-death-cutout-20260826'")
s=s.replace("devourer:'/assets/animations/enemies/runtime/devourer/death/frame-01.webp?v=generated-actions-20260826'", "devourer:'/assets/enemies/data-devourer.png?v=clean-death-cutout-20260826'")
s=s.replace("faraday:'/assets/animations/enemies/runtime/faraday/death/frame-01.webp?v=generated-actions-20260826'", "faraday:'/assets/enemies/new/enemy-06-faraday-suppressor.png?v=clean-death-cutout-20260826'")
s=s.replace("hijacker:'/assets/animations/enemies/runtime/hijacker/death/frame-01.webp?v=generated-actions-20260826'", "hijacker:'/assets/enemies/new/enemy-07-hijack-hovercraft.png?v=clean-death-cutout-20260826'")
s=s.replace("previewFrames:runtimePreviewFrames[seed.id]?.map((url)=>url.replace('/runtime-clean-v4/','/runtime-clean-v4/').replace('/ATTACK/','/death/'))", "previewFrames:!['aerostat','devourer','faraday','hijacker'].includes(seed.id) ? runtimePreviewFrames[seed.id]?.map((url)=>url.replace('/runtime/','/runtime-clean-v4/').replace('/ATTACK/','/death/')) : undefined")
fs.writeFileSync(p,s,'utf8')

const q='src/entities/EnemyActor.ts'; let a=fs.readFileSync(q,'utf8')
const needle="    if (!leaked && !this.enemy.isBoss && CLEAN_FALL_DEATH_IDS.has(this.enemy.typeId)) {\n"
const repl="    if (!leaked && !this.enemy.isBoss && CLEAN_FALL_DEATH_IDS.has(this.enemy.typeId)) {\n      const cleanTexture = textureKeyFor(this.enemy)\n      if (this.scene.textures.exists(cleanTexture)) this.sprite.setTexture(cleanTexture)\n"
if(!a.includes(needle)) throw new Error('clean death block missing'); a=a.replace(needle,repl); fs.writeFileSync(q,a,'utf8')
