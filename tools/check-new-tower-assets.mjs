import { PNG } from 'pngjs'
import { readdir, readFile } from 'node:fs/promises'
const dir='public/assets/towers/new-concepts'
const files=(await readdir(dir)).filter(f=>f.endsWith('.png'))
const results=[]
for(const file of files){
 const png=PNG.sync.read(await readFile(`${dir}/${file}`))
 let transparent=0
 for(let i=3;i<png.data.length;i+=4) if(png.data[i]===0) transparent++
 results.push({file,width:png.width,height:png.height,transparentPixels:transparent})
}
console.log(JSON.stringify(results,null,2))
if(results.length!==15||results.some(x=>x.width!==1024||x.height!==1024||x.transparentPixels===0))process.exit(1)
