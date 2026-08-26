import fs from 'node:fs'
const p='src/data/enemyRuntimeAnimations.ts'; let s=fs.readFileSync(p,'utf8')
const old="  return `assets/animations/enemies/runtime/${typeId}/${motion}/frame-${String(frame).padStart(2, '0')}.webp`"
const neu="  const cleanDeath = motion === 'death' && ['aerostat', 'devourer', 'faraday', 'hijacker'].includes(typeId)\n  const root = cleanDeath ? 'runtime-clean' : 'runtime'\n  return `assets/animations/enemies/${root}/${typeId}/${motion}/frame-${String(frame).padStart(2, '0')}.webp`"
if(!s.includes(old)) throw new Error('runtime path not found'); s=s.replace(old,neu); fs.writeFileSync(p,s,'utf8')
const q='src/data/animationCatalog.ts'; let a=fs.readFileSync(q,'utf8'); a=a.replace("previewFrames:runtimePreviewFrames[seed.id]?.map((url)=>url.replace('/ATTACK/','/death/'))", "previewFrames:runtimePreviewFrames[seed.id]?.map((url)=>url.replace('/runtime/','/runtime-clean/').replace('/ATTACK/','/death/'))"); fs.writeFileSync(q,a,'utf8')
