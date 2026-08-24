import { readFile, writeFile } from 'node:fs/promises'
const path='asset-generation-spec.json'
const spec=JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''))
const lines=[
  ['gravity-nail','重力钉',['重力钉','重力钉','重力钉','深井封锁','天幕偏转'],['level-1','level-2','level-3','level-4-deep-well-lockdown','level-4-sky-deflection'],'gravity'],
  ['grey-tide','灰潮解构站',['灰潮解构站','灰潮解构站','灰潮解构站','噬甲集群','清道夫协议'],['level-1','level-2','level-3','level-4-armor-eater-swarm','level-4-scavenger-protocol'],'nano'],
  ['trajectory-rewriter','轨迹回写器',['轨迹回写器','轨迹回写器','轨迹回写器','回滚节点','断点处决'],['level-1','level-2','level-3','level-4-rollback-node','level-4-breakpoint-execution'],'rewrite'],
]
const prompts={
 gravity:'保留原图的等距视角、底座、投射器布局和升级关系，将结构简化约35%。去除大面积漩涡、闪电、魔法光环和水晶感；质量场只用黑色机械孔径、烟色玻璃、少量青紫状态灯表达。减少发光线路与碎小零件，突出枪铁装甲、黄铜关节、液压支架、散热器、线缆和企业军工设备感。',
 nano:'保留原图的等距视角、回收平台、纳米处理罐、机械臂和升级关系，将结构简化约35%。去除触手怪、绿色魔法液体、诅咒雾气和过强荧光；纳米技术只用密封罐内的细小灰绿色颗粒、分析灯和少量冷却液表达。突出工业回收、材料扫描、装甲拆解与企业黑科技，减少碎小零件。',
 rewrite:'保留原图的等距视角、非同心校准环、状态缓存核心、扫描器和升级关系，将结构简化约35%。去除魔法传送门、巨大能量流、时间法术光环和过多全息轨迹；只保留少量细线坐标投影、青色状态灯与紫红错误指示。突出服务器、相位稳定器、传感器、机械环轨和非法企业量子设备。'
}
for(const [idPrefix,towerName,names,suffixes,promptKey] of lines){
 suffixes.forEach((suffix,index)=>{
   const id=`simplified-${idPrefix}-${suffix}`
   if(spec.items.some(x=>x.id===id)) return
   const tier=index<3?index+1:4
   const branch=index===3?'A':index===4?'B':undefined
   spec.items.push({
     id,tier,...(branch?{branch}:{}),categoryId:idPrefix,towerName,name:names[index],
     referenceAsset:`/assets/towers/new-concepts/${idPrefix}-${suffix}.png`,
     targetFile:`simplified-${idPrefix}-${suffix}.png`,
     prompt:`${prompts[promptKey]} 当前为第${tier}级${branch?`分支${branch}`:''}，必须保留该等级原有的主要轮廓和分支功能差异；赛博朋克科技感优先，干净、克制、游戏尺度可读。纯白背景，无文字，无水印。`
   })
 })
}
await writeFile(path,JSON.stringify(spec,null,2),'utf8')
console.log('items',spec.items.length)
