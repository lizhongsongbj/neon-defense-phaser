import fs from 'node:fs/promises'; import path from 'node:path'; import sharp from 'sharp'
const root=process.cwd(), runtime=path.join(root,'public/assets/animations/enemies/runtime')
const jobs={aerostat:12,devourer:12,faraday:8,hijacker:12}
async function fallFrame(src, frame, count){
 const progress=(frame-1)/Math.max(1,count-1)
 const angle=progress < .12 ? 0 : Math.min(82, (progress-.12)/.88*82)
 const y=Math.round(Math.max(0,progress-.08)*78)
 const fade=progress < .72 ? 1 : Math.max(.08,1-(progress-.72)/.28*.92)
 const raw=await sharp(src).rotate(angle,{background:{r:0,g:0,b:0,alpha:0}}).resize(468,468,{fit:'inside'}).png().toBuffer()
 const meta=await sharp(raw).metadata(); const w=meta.width??468,h=meta.height??468
 const placed=await sharp({create:{width:512,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:raw,left:Math.round((512-w)/2),top:Math.min(512-h,Math.round((512-h)/2+y))}]).png().toBuffer()
 const {data,info}=await sharp(placed).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 for(let i=3;i<data.length;i+=info.channels)data[i]=Math.round(data[i]*fade)
 return sharp(data,{raw:info}).webp({lossless:true,quality:92}).toBuffer()
}
for(const [id,count] of Object.entries(jobs)){
 const move=path.join(runtime,id,'move'),death=path.join(runtime,id,'death')
 for(let i=1;i<=count;i++){const s=String(i).padStart(2,'0');const src=await fs.readFile(path.join(move,`frame-${s}.webp`));await fs.writeFile(path.join(death,`frame-${s}.webp`),await fallFrame(src,i,count))}
 console.log(`${id}: rebuilt ${count} clean fall-and-disappear frames`)
}
