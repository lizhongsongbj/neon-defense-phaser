import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root=process.cwd()
const publicRoot=path.join(root,'public')
const targetRoots=['assets/towers','assets/enemies','assets/units','assets/generated/cutout','assets/generated/progression','assets/animations'].map(p=>path.join(publicRoot,p))
const backupRoot=path.join(root,'tools','asset-alpha-backup-2026-08-24')
const reportPath=path.join(root,'tools','asset-alpha-audit.json')
const apply=process.argv.includes('--apply')
const strict=process.argv.includes('--check')
const whiteMin=235
const maxSpread=26
const minPixels=48
const minRatio=0.00015
const fringeTargets=new Set([
  'assets/towers/new-concepts/simplified/gravity-nail-level-1.png',
  'assets/towers/new-concepts/simplified/gravity-nail-level-2.png',
  'assets/towers/new-concepts/simplified/gravity-nail-level-3.png',
  'assets/towers/new-concepts/simplified/gravity-nail-level-4-deep-well-lockdown.png',
  'assets/towers/new-concepts/simplified/gravity-nail-level-4-sky-deflection.png',
  'assets/towers/generated-raw-selected/tower-02-arc-neon-base-cutout-1.png',
  'assets/generated/progression/tier-2/arc-neon-tier-2.png',
  'assets/generated/cutout/arc-neon-tier-3-2026-08-23T11-49-31-954Z.png',
  'assets/generated/cutout/arc-neon-storm-core-2026-08-23T11-25-45-551Z.png',
  'assets/generated/cutout/arc-neon-superconductor-2026-08-23T11-25-37-154Z.png',
  'assets/towers/generated-raw-selected/tower-04-hacker-relay-base-cutout.png',
  'assets/generated/progression/tier-2/hacker-tier-2.png',
  'assets/generated/cutout/hacker-tier-3-2026-08-23T11-53-44-631Z.png',
  'assets/generated/cutout/hacker-zero-day-control-2026-08-23T11-11-56-802Z.png',
  'assets/generated/cutout/hacker-black-ice-breaker-2026-08-23T11-13-18-369Z.png',
  'assets/generated/cutout/arc-neon-storm-core-2026-08-23T11-07-49-358Z.png',
  'assets/generated/cutout/arc-neon-superconductor-2026-08-23T11-08-53-724Z.png',
  'assets/generated/cutout/arc-neon-tier-2-2026-08-23T11-40-26-825Z.png',
  'assets/generated/cutout/hacker-tier-2-2026-08-23T11-46-08-861Z.png',
  'assets/generated/cutout/simplified-gravity-nail-level-1-2026-08-23T12-20-27-622Z.png',
  'assets/generated/cutout/simplified-gravity-nail-level-2-2026-08-23T12-20-13-899Z.png',
  'assets/generated/cutout/simplified-gravity-nail-level-3-2026-08-23T12-20-27-824Z.png',
  'assets/generated/cutout/simplified-gravity-nail-level-4-deep-well-lockdown-2026-08-23T12-21-26-723Z.png',
  'assets/generated/cutout/simplified-gravity-nail-level-4-sky-deflection-2026-08-23T12-21-37-182Z.png',
])

async function walk(dir){
  const out=[]
  try{
    for(const entry of await fs.readdir(dir,{withFileTypes:true})){
      const file=path.join(dir,entry.name)
      if(entry.isDirectory()) out.push(...await walk(file))
      else if(/\.(png|webp)$/i.test(entry.name)) out.push(file)
    }
  }catch{}
  return out
}

function removeConnectedWhite(raw,width,totalHeight,channels,pageHeight=totalHeight){
  const data=Buffer.from(raw)
  const pages=Math.max(1,Math.round(totalHeight/pageHeight))
  let removed=0
  for(let page=0;page<pages;page++){
    const offsetY=page*pageHeight
    const count=width*pageHeight
    const visited=new Uint8Array(count)
    const queue=new Int32Array(count)
    let head=0,tail=0
    const candidate=(localIndex)=>{
      const y=Math.floor(localIndex/width)+offsetY, x=localIndex%width
      const i=(y*width+x)*channels
      const r=data[i],g=data[i+1],b=data[i+2],a=channels===4?data[i+3]:255
      return a>0&&Math.min(r,g,b)>=whiteMin&&(Math.max(r,g,b)-Math.min(r,g,b))<=maxSpread
    }
    const enqueue=(x,y)=>{
      if(x<0||y<0||x>=width||y>=pageHeight)return
      const idx=y*width+x
      if(visited[idx]||!candidate(idx))return
      visited[idx]=1;queue[tail++]=idx
    }
    for(let x=0;x<width;x++){enqueue(x,0);enqueue(x,pageHeight-1)}
    for(let y=1;y<pageHeight-1;y++){enqueue(0,y);enqueue(width-1,y)}
    while(head<tail){
      const idx=queue[head++],x=idx%width,y=Math.floor(idx/width)
      enqueue(x-1,y);enqueue(x+1,y);enqueue(x,y-1);enqueue(x,y+1)
    }
    for(let idx=0;idx<count;idx++){
      if(!visited[idx])continue
      const y=Math.floor(idx/width)+offsetY,x=idx%width,i=(y*width+x)*channels
      if(channels===4&&data[i+3]!==0){data[i+3]=0;removed++}
    }
  }
  return {data,removed,pages}
}

function removeWhiteFringe(data,width,totalHeight,channels,pageHeight=totalHeight){
  const pages=Math.max(1,Math.round(totalHeight/pageHeight))
  let removed=0
  for(let page=0;page<pages;page++){
    const offsetY=page*pageHeight,count=width*pageHeight
    const visited=new Uint8Array(count),queue=new Int32Array(count)
    let head=0,tail=0
    const state=(idx)=>{
      const y=Math.floor(idx/width)+offsetY,x=idx%width,i=(y*width+x)*channels
      const r=data[i],g=data[i+1],b=data[i+2],a=channels===4?data[i+3]:255
      return {transparent:a<=8,white:a>8&&Math.min(r,g,b)>=210&&(Math.max(r,g,b)-Math.min(r,g,b))<=35}
    }
    const enqueue=(idx)=>{
      if(idx<0||idx>=count||visited[idx])return
      const pixel=state(idx)
      if(!pixel.transparent&&!pixel.white)return
      visited[idx]=1;queue[tail++]=idx
    }
    for(let idx=0;idx<count;idx++){
      const y=Math.floor(idx/width)+offsetY,x=idx%width,i=(y*width+x)*channels
      if(channels===4&&data[i+3]<=8)enqueue(idx)
    }
    while(head<tail){
      const idx=queue[head++],pixel=state(idx),x=idx%width,y=Math.floor(idx/width)
      if(pixel.white){const gy=y+offsetY,i=(gy*width+x)*channels;data[i+3]=0;removed++}
      if(x>0)enqueue(idx-1);if(x<width-1)enqueue(idx+1);if(y>0)enqueue(idx-width);if(y<pageHeight-1)enqueue(idx+width)
    }
  }
  return removed
}

async function inspect(file){
  const image=sharp(file,{animated:true,limitInputPixels:false}).ensureAlpha()
  const meta=await image.metadata()
  const {data,info}=await image.raw().toBuffer({resolveWithObject:true})
  const pageHeight=meta.pageHeight??info.height
  const result=removeConnectedWhite(data,info.width,info.height,info.channels,pageHeight)
  const relative=path.relative(publicRoot,file).replaceAll('\\','/')
  const fringeRemoved=fringeTargets.has(relative)?removeWhiteFringe(result.data,info.width,info.height,info.channels,pageHeight):0
  const pixels=info.width*info.height
  return {file,width:info.width,height:pageHeight,pages:meta.pages??1,format:meta.format,hasAlpha:Boolean(meta.hasAlpha),removed:result.removed,fringeRemoved,ratio:result.removed/pixels,data:result.data,info,meta}
}

async function writeProcessed(item){
  const relative=path.relative(publicRoot,item.file)
  const backup=path.join(backupRoot,relative)
  await fs.mkdir(path.dirname(backup),{recursive:true})
  try{await fs.access(backup)}catch{await fs.copyFile(item.file,backup)}
  const input=sharp(item.data,{raw:{width:item.info.width,height:item.info.height,channels:4,pageHeight:item.height}})
  const temp=`${item.file}.alpha-temp`
  if(item.format==='webp'){
    await input.webp({quality:95,alphaQuality:100,effort:5,loop:item.meta.loop??0,delay:item.meta.delay}).toFile(temp)
  }else{
    await input.png({compressionLevel:9,adaptiveFiltering:true}).toFile(temp)
  }
  await fs.rename(temp,item.file)
}

const files=(await Promise.all(targetRoots.map(walk))).flat()
const records=[]
let changed=0
for(const file of files){
  try{
    const item=await inspect(file)
    const shouldFix=(item.removed>=minPixels&&item.ratio>=minRatio)||item.fringeRemoved>=32
    records.push({path:path.relative(publicRoot,file).replaceAll('\\','/'),format:item.format,width:item.width,height:item.height,pages:item.pages,hadAlpha:item.hasAlpha,connectedWhitePixels:item.removed,connectedWhiteRatio:Number(item.ratio.toFixed(6)),fringeWhitePixels:item.fringeRemoved,needsFix:shouldFix})
    if(apply&&shouldFix){await writeProcessed(item);changed++;console.log('fixed',path.relative(publicRoot,file),item.removed+item.fringeRemoved)}
  }catch(error){records.push({path:path.relative(publicRoot,file).replaceAll('\\','/'),error:String(error),needsFix:false})}
}
records.sort((a,b)=>(Number(b.connectedWhitePixels)||0)-(Number(a.connectedWhitePixels)||0))
const summary={date:'2026-08-24',mode:apply?'apply':'audit',scanned:files.length,needsFix:records.filter(r=>r.needsFix).length,changed,whiteMin,maxSpread,minPixels,minRatio,backupRoot:path.relative(root,backupRoot).replaceAll('\\','/'),records}
await fs.writeFile(reportPath,JSON.stringify(summary,null,2),'utf8')
console.log(JSON.stringify({scanned:summary.scanned,needsFix:summary.needsFix,changed:summary.changed,report:path.relative(root,reportPath)},null,2))
if(strict&&summary.needsFix>0)process.exit(1)
