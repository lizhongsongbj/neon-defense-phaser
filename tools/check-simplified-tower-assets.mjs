import { PNG } from 'pngjs'; import { readdir,readFile } from 'node:fs/promises'
const dir='public/assets/towers/new-concepts/simplified'; const files=(await readdir(dir)).filter(f=>f.endsWith('.png')); const out=[]
for(const file of files){const p=PNG.sync.read(await readFile(`${dir}/${file}`));let a=0;for(let i=3;i<p.data.length;i+=4)if(p.data[i]===0)a++;out.push({file,w:p.width,h:p.height,transparent:a})}
console.log(JSON.stringify(out,null,2));if(files.length!==15||out.some(x=>x.transparent===0))process.exit(1)
