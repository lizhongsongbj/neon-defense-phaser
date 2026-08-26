import fs from 'node:fs'
const p='src/data/enemyRuntimeAnimations.ts'; let s=fs.readFileSync(p,'utf8').replace("'runtime-clean-v3'", "'runtime-clean-v4'"); fs.writeFileSync(p,s,'utf8')
const q='src/data/animationCatalog.ts'; let a=fs.readFileSync(q,'utf8').replace('/runtime-clean-v3/','/runtime-clean-v4/'); fs.writeFileSync(q,a,'utf8')
