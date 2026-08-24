import { readFile, writeFile } from 'node:fs/promises'
const path='asset-generation-spec.json'
const spec=JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''))
const designs=[
  {
    prefix:'revised-grey-tide', category:'grey-tide', tower:'灰潮解构站', folder:'simplified',
    names:['灰潮解构站','灰潮解构站','灰潮解构站','噬甲集群','清道夫协议'],
    suffixes:['level-1','level-2','level-3','level-4-armor-eater-swarm','level-4-scavenger-protocol'],
    prompts:[
      '第一级。以中央灰绿色密封纳米罐体作为绝对视觉主体，占塔体高度与视觉面积的一半以上。罐体安装在简洁圆形工业底座上，周围只有两组低矮泵机、粗管道、材料扫描窗和少量状态灯。完全取消钳子、爪子、触手、机械动物和武器炮管。结构简单、低级、清晰。',
      '第二级。延续第一级中央灰绿色密封罐体，罐体更高并增加一圈装甲固定箍、底部循环泵环、三根粗回流管和两个低矮注入喷口。中央罐体仍是绝对主体。完全没有钳子、爪子、触手或机械动物结构。比一级复杂约30%。',
      '第三级。延续前两级中央灰绿色罐体，形成成熟的纳米材料处理塔：大型分段透明罐、顶部材料分析盖、环形过滤器、四个无爪的固定喷射节点、散热器和回收管网。罐体必须最醒目，外围设备低于罐体。无钳子、无机械爪、无触手、无蜘蛛轮廓。',
      '第四级A 噬甲集群。以超大型中央灰绿色纳米罐体为主体，罐内显示细密灰绿色纳米颗粒与分层循环，不是魔法液体。外围使用环形复制舱、多个短小无爪喷嘴、导流管与装甲分析传感器表达叠加和传播。彻底取消所有钳子、爪子、机械腿、触手和蜘蛛外形。整体为圆形工业侵蚀平台，罐体占核心视觉。',
      '第四级B 清道夫协议。以高大中央灰绿色回收罐体为主体，增加顶部精密材料扫描环、侧面分类仓、合金压缩模块、资源计量器和向外供能的粗管道。可以有固定式无爪机械导轨，但禁止钳子、机械爪、触手和动物轮廓。突出高价值材料回收与企业工业设备，中央罐体最醒目。'
    ]
  },
  {
    prefix:'revised-trajectory-rewriter', category:'trajectory-rewriter', tower:'轨迹回写器', folder:'simplified',
    names:['轨迹回写器','轨迹回写器','轨迹回写器','回滚节点','断点处决'],
    suffixes:['level-1','level-2','level-3','level-4-rollback-node','level-4-breakpoint-execution'],
    prompts:[
      '第一级。以一个清晰完整的圆形科技传送门作为绝对主体：厚重枪铁门环竖立在低矮装甲底座上，内侧仅有细窄青色坐标灯带，门内为空或深色半透明校准膜。底座配两个小型服务器盒和传感器。轮廓简洁，不要多重环、巨大能量、魔法符文或时钟。',
      '第二级。延续第一级完整圆形科技门环，增加第二层贴合式校准轨、两侧相位稳定器、底部双缓存罐和少量紫红错误指示灯。圆形门仍是绝对主体且清楚完整。不要魔法传送效果、旋涡、时钟、悬浮球或复杂轨迹流。',
      '第三级。延续前两级圆形科技传送门，形成成熟的战术状态回写门：加厚分段装甲门环、内外双轨校准结构、顶部坐标扫描器、底部服务器核心和四个低矮相位锚。门洞保持清晰可见，少量细线网格表示坐标缓存。不要多层杂乱球环、魔法漩涡或时间法术。',
      '第四级A 回滚节点。以大型完整圆形科技传送门为主体，门环更宽，带分段坐标轨道和多个沿环移动的数据节点；两侧增加路线记录服务器与地面相位锚。门洞显示克制的青色道路网格和两三道位置残影线，禁止巨大能量河流、魔法旋涡、符文和时钟。轮廓偏宽，强调多目标路线回退。',
      '第四级B 断点处决。以强化圆形科技传送门为主体，门环前方安装一个紧凑的定向状态重写模块，但不能变成普通大炮。门环两侧是伤害缓存服务器和紫红断点指示器，内圈形成收束式机械光阑。门洞清晰，能量表现克制，仅用青白校准线。不要悬浮魔法球、漩涡、时钟、符文或巨型炮管。'
    ]
  }
]
for(const design of designs){
 design.suffixes.forEach((suffix,index)=>{
  const id=`${design.prefix}-${suffix}`
  if(spec.items.some(x=>x.id===id)) return
  const tier=index<3?index+1:4; const branch=index===3?'A':index===4?'B':undefined
  spec.items.push({id,tier,...(branch?{branch}:{}),categoryId:design.category,towerName:design.tower,name:design.names[index],referenceAsset:`/assets/towers/new-concepts/${design.folder}/${design.category}-${suffix}.png`,targetFile:`${id}.png`,prompt:`${design.prompts[index]} 保持霓虹防线既有赛博朋克塔楼风格：等距俯视、深灰枪铁、黄铜结构件、少量青色灯和琥珀维护灯；减少魔法元素和表面碎件，纯白背景，无文字，无水印。`})
 })
}
await writeFile(path,JSON.stringify(spec,null,2),'utf8')
console.log('items',spec.items.length)
