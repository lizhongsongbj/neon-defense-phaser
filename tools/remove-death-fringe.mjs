import fs from 'node:fs/promises'; import path from 'node:path'; import sharp from 'sharp'
const root=process.cwd(), out=path.join(root,'public/assets/animations/enemies/runtime-clean'), jobs={aerostat:12,devourer:12,faraday:8,hijacker:12}
for(const [id,count] of Object.entries(jobs))for(let i=1;i<=count;i++){const s=String(i).padStart(2,'0'),p=path.join(out,id,'death',`frame-${s}.webp`);const {data,info}=await sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let k=3;k<data.length;k+=info.channels)if(data[k]<190)data[k]=0;await fs.writeFile(p,await sharp(data,{raw:info}).webp({lossless:true,quality:92}).toBuffer())}
console.log('removed low-alpha fringe pixels from clean deaths')
