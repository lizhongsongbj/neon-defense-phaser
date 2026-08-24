import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root=process.cwd()
const outputRoot=path.join(root,'public/assets/animations/towers')
const size=512
const frames=14
const delay=[55,55,55,55,55,55,55,55,55,55,55,55,55,165]

const forms=[
  {id:'tower-01-magnetic-rail-tier-2-attack',source:'public/assets/generated/progression/tier-2/mag-rail-tier-2.png',base:446,muzzle:[414,103],variant:'calibration',accent:'#38e8ff'},
  {id:'tower-01-magnetic-rail-tier-3-attack',source:'public/assets/generated/cutout/mag-rail-tier-3-2026-08-23T11-48-26-946Z.png',base:450,muzzle:[448,128],variant:'dual',accent:'#55eaff'},
  {id:'tower-01-magnetic-rail-sky-verdict-attack',source:'public/assets/generated/cutout/mag-rail-sky-verdict-2026-08-23T11-25-23-710Z.png',base:452,muzzle:[446,91],variant:'sky',accent:'#8befff'},
  {id:'tower-01-magnetic-rail-city-piercer-attack',source:'public/assets/generated/cutout/mag-rail-city-piercer-2026-08-23T11-25-22-347Z.png',base:452,muzzle:[445,100],variant:'city',accent:'#a36bff'},
]

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v))

function flood(data,width,height,channels,minimum,spread,seedTransparent){
  const count=width*height,visited=new Uint8Array(count),queue=new Int32Array(count)
  let head=0,tail=0,removed=0
  const state=(index)=>{const i=index*channels,r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];return{transparent:a<=8,white:a>8&&Math.min(r,g,b)>=minimum&&Math.max(r,g,b)-Math.min(r,g,b)<=spread}}
  const add=(index)=>{if(index<0||index>=count||visited[index])return;const p=state(index);if(!p.white&&!(seedTransparent&&p.transparent))return;visited[index]=1;queue[tail++]=index}
  if(seedTransparent){for(let i=0;i<count;i++)if(data[i*channels+3]<=8)add(i)}else{for(let x=0;x<width;x++){add(x);add((height-1)*width+x)}for(let y=1;y<height-1;y++){add(y*width);add(y*width+width-1)}}
  while(head<tail){const index=queue[head++],p=state(index);if(p.white){data[index*channels+3]=0;removed++}const x=index%width,y=Math.floor(index/width);if(x)add(index-1);if(x<width-1)add(index+1);if(y)add(index-width);if(y<height-1)add(index+width)}
  return removed
}

async function cleanSource(file){
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  flood(data,info.width,info.height,info.channels,235,26,false)
  flood(data,info.width,info.height,info.channels,210,35,true)
  return sharp(data,{raw:info}).png().toBuffer()
}

function effectSvg(form,frame){
  const charge=clamp(frame/6,0,1)
  const fire=Math.exp(-Math.pow((frame-7.1)/0.72,2))
  const travel=frame>=8&&frame<=10?1:0
  const travelOffset=Math.max(0,frame-8)*48
  const [mx,my]=form.muzzle
  const common=`<circle cx="${mx}" cy="${my}" r="${2+fire*7}" fill="${form.accent}" opacity="${fire}"/>`
  if(form.variant==='calibration')return `<svg width="512" height="512"><g>${common}<path d="M${mx-53} ${my+27} h8 m-4 -4 v8 M${mx-31} ${my+43} h8 m-4 -4 v8" stroke="#4ef4ff" stroke-width="2" opacity="${frame>2&&frame<7?charge*.45:0}"/>${travel?`<path d="M${mx+travelOffset} ${my-travelOffset*.35} l28 -10 l-13 20 z" fill="#baffff" opacity="${1-(frame-8)*.22}"/>`:''}</g></svg>`
  if(form.variant==='dual')return `<svg width="512" height="512"><g>${common}<circle cx="${mx-8}" cy="${my+17}" r="${2+fire*6}" fill="#58eaff" opacity="${fire}"/>${travel?`<path d="M${mx+travelOffset} ${my-9-travelOffset*.3} l30 -9 l-12 17 z M${mx+travelOffset-4} ${my+15-travelOffset*.3} l30 -7 l-12 16 z" fill="#9effff" opacity="${1-(frame-8)*.2}"/>`:''}</g></svg>`
  if(form.variant==='sky')return `<svg width="512" height="512"><g>${common}<path d="M${mx-72} ${my+68} l18 -18 m-18 0 l18 18" stroke="#8befff" stroke-width="3" opacity="${frame<7?charge*.7:0}"/>${travel?`<path d="M${mx+travelOffset} ${my-travelOffset*.55} l36 -18 l-14 27 z" fill="#d4ffff" opacity="${1-(frame-8)*.2}"/><circle cx="${mx+travelOffset+18}" cy="${my-travelOffset*.55-5}" r="13" fill="none" stroke="#74dcff" stroke-width="3" opacity=".7"/>`:''}</g></svg>`
  return `<svg width="512" height="512"><g>${common}<circle cx="${mx-105}" cy="${my+98}" r="${3+charge*5}" fill="#905cff" opacity="${frame<8?charge*.22:0}"/>${travel?`<path d="M${mx+travelOffset} ${my-travelOffset*.28} l42 -13 l-13 27 z" fill="#d6c4ff" opacity="${1-(frame-8)*.18}"/><path d="M${mx+travelOffset-30} ${my+4-travelOffset*.28} h72" stroke="#7d4cff" stroke-width="8" opacity=".75"/>`:''}</g></svg>`
}

function movement(form,frame){
  const charge=clamp(frame/6,0,1)
  const recoil=Math.exp(-Math.pow((frame-7.4)/1.05,2))
  const recovery=frame>8?clamp((frame-8)/5,0,1):0
  const strength=form.variant==='calibration'?1:form.variant==='dual'?1.3:form.variant==='sky'?1.15:1.55
  return {x:Math.round(-recoil*7*strength+recovery*1.5),y:Math.round(recoil*5*strength),rotate:-charge*.35+recoil*1.4*strength,scaleX:1+charge*.006-recoil*.012,scaleY:1+recoil*.01}
}

async function render(form){
  const source=await cleanSource(path.join(root,form.source))
  const rawFrames=[]
  for(let frame=0;frame<frames;frame++){
    const m=movement(form,frame)
    const actor=await sharp(source).resize(Math.round(form.base*m.scaleX),Math.round(form.base*m.scaleY),{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).rotate(m.rotate,{background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
    const meta=await sharp(actor).metadata()
    const left=Math.round((size-(meta.width??form.base))/2+m.x)
    const top=Math.round((size-(meta.height??form.base))/2+m.y)
    const effect=Buffer.from(effectSvg(form,frame))
    const png=await sharp({create:{width:size,height:size,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:actor,left,top},{input:effect,left:0,top:0}]).png().toBuffer()
    rawFrames.push(await sharp(png).ensureAlpha().raw().toBuffer())
  }
  const output=path.join(outputRoot,`${form.id}.webp`)
  await sharp(Buffer.concat(rawFrames),{raw:{width:size,height:size*frames,channels:4,pageHeight:size}}).webp({quality:94,alphaQuality:100,effort:5,loop:0,delay}).toFile(output)
  const meta=await sharp(output,{animated:true}).metadata()
  console.log(path.relative(root,output),meta.pages,'frames')
}

await fs.mkdir(outputRoot,{recursive:true})
for(const form of forms)await render(form)
