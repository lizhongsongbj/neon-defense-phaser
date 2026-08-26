import fs from 'node:fs/promises'; import path from 'node:path'; import sharp from 'sharp'
const root=process.cwd(), rootDir=path.join(root,'public/assets/animations/enemies/runtime'), tempRoot=path.join(root,'tools/.clean-enemy-frames')
const jobs={aerostat:{count:12},devourer:{count:12},faraday:{count:8},hijacker:{count:12}}
async function clean(file){const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});const w=info.width,h=info.height,opaque=new Uint8Array(w*h);for(let i=0;i<w*h;i++)opaque[i]=data[i*info.channels+3]>18?1:0
 for(let y=0;y<h;y++){let x=0;while(x<w){while(x<w&&!opaque[y*w+x])x++;const start=x;while(x<w&&opaque[y*w+x])x++;const end=x;const len=end-start;if(len<36)continue;for(let px=start;px<end;px++){let vertical=0;for(let yy=Math.max(0,y-4);yy<=Math.min(h-1,y+4);yy++)vertical+=opaque[yy*w+px];if(vertical<=10){const idx=(y*w+px)*info.channels;data[idx+3]=0}}}}
 return sharp(data,{raw:info}).webp({lossless:true,quality:92}).toBuffer()}
await fs.rm(tempRoot,{recursive:true,force:true}); await fs.mkdir(tempRoot,{recursive:true})
for(const [id,j] of Object.entries(jobs)){for(const motion of ['move','attack','death'])for(let i=1;i<=j.count;i++){const s=String(i).padStart(2,'0'),src=path.join(rootDir,id,motion,`frame-${s}.webp`),dst=path.join(tempRoot,id,motion,`frame-${s}.webp`);await fs.mkdir(path.dirname(dst),{recursive:true});await fs.writeFile(dst,await clean(src))}console.log(id,'cleaned')}
for(const [id,j] of Object.entries(jobs))for(const motion of ['move','attack','death'])for(let i=1;i<=j.count;i++){const s=String(i).padStart(2,'0'),src=path.join(tempRoot,id,motion,`frame-${s}.webp`),dst=path.join(rootDir,id,motion,`frame-${s}.webp`),bak=`${dst}.bak-clean`;try{await fs.rename(dst,bak);await fs.rename(src,dst);await fs.rm(bak,{force:true})}catch(e){console.error('replace failed',dst,e.message)}}
await fs.rm(tempRoot,{recursive:true,force:true})
