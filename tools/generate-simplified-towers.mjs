import { readFile, copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
const origin='http://127.0.0.1:5174'
const spec=JSON.parse((await readFile('asset-generation-spec.json','utf8')).replace(/^\uFEFF/,''))
const items=spec.items.filter(x=>x.id.startsWith('simplified-'))
const outputDir=resolve('public/assets/towers/new-concepts/simplified')
await mkdir(outputDir,{recursive:true})
async function generate(item){
 console.log('START',item.id)
 const response=await fetch(`${origin}/api/generate-asset`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,prompt:item.prompt,size:'1024x1024',outputMode:'cutout'}),signal:AbortSignal.timeout(600000)})
 const payload=await response.json()
 if(!response.ok)throw new Error(`${item.id}: ${payload.message||response.status}`)
 const source=resolve('public',payload.imageUrl.replace(/^\//,''))
 const target=resolve(outputDir,item.targetFile.replace(/^simplified-/,''))
 await copyFile(source,target)
 console.log('DONE',item.id,'->',target)
 return {id:item.id,target,imageUrl:payload.imageUrl}
}
const results=[]
for(let i=0;i<items.length;i+=3){
 const batch=items.slice(i,i+3)
 results.push(...await Promise.all(batch.map(generate)))
}
console.log(JSON.stringify(results,null,2))
