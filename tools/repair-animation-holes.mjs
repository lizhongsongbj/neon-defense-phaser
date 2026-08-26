import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve('public/assets/animations/enemies/runtime')
const outRoot = path.resolve('public/assets/animations/enemies/runtime-repaired-v1')
const types = ['aerostat','devourer','faraday','hijacker']
const dirs = []
for (const type of types) {
  const dir = path.join(root,type,'attack')
  const files = (await fs.readdir(dir)).filter(f=>f.endsWith('.webp')).sort()
  for (const file of files) dirs.push({type,file,input:path.join(dir,file),output:path.join(outRoot,type,'attack',file)})
}
function index(x,y,w){ return (y*w+x) }
for (const item of dirs) {
  const {data,info}=await sharp(item.input).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const {width:w,height:h}=info
  const n=w*h
  const transparent=new Uint8Array(n)
  const outside=new Uint8Array(n)
  const qx=new Int32Array(n), qy=new Int32Array(n)
  let head=0,tail=0
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(data[(index(x,y,w)<<2)+3] < 8) transparent[index(x,y,w)]=1
  for(let x=0;x<w;x++){ if(transparent[index(x,0,w)]){outside[index(x,0,w)]=1;qx[tail]=x;qy[tail++]=0} if(transparent[index(x,h-1,w)]){outside[index(x,h-1,w)]=1;qx[tail]=x;qy[tail++]=h-1} }
  for(let y=1;y<h-1;y++){ if(transparent[index(0,y,w)]){outside[index(0,y,w)]=1;qx[tail]=0;qy[tail++]=y} if(transparent[index(w-1,y,w)]){outside[index(w-1,y,w)]=1;qx[tail]=w-1;qy[tail++]=y} }
  while(head<tail){ const x=qx[head],y=qy[head++]; for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const k=index(nx,ny,w);if(transparent[k]&&!outside[k]){outside[k]=1;qx[tail]=nx;qy[tail++]=ny}} }
  const dist=new Int32Array(n); dist.fill(-1); const sx=new Int32Array(n), sy=new Int32Array(n); head=tail=0
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){const k=index(x,y,w); if(!transparent[k] && data[k*4+3]>=8){dist[k]=0;sx[k]=x;sy[k]=y;qx[tail]=x;qy[tail++]=y}}
  while(head<tail){const x=qx[head],y=qy[head++];const k=index(x,y,w);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const nk=index(nx,ny,w);if(dist[nk]===-1){dist[nk]=dist[k]+1;sx[nk]=sx[k];sy[nk]=sy[k];qx[tail]=nx;qy[tail++]=ny}}}
  let filled=0
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){const k=index(x,y,w); if(transparent[k]&&!outside[k]){const sk=index(sx[k],sy[k],w); data[k*4]=data[sk*4];data[k*4+1]=data[sk*4+1];data[k*4+2]=data[sk*4+2];data[k*4+3]=Math.max(180,data[sk*4+3]);filled++}}
  await fs.mkdir(path.dirname(item.output),{recursive:true})
  await sharp(data,{raw:{width:w,height:h,channels:4}}).webp({lossless:true}).toFile(item.output)
  console.log(`${item.type}/${item.file}: filled ${filled}`)
}
