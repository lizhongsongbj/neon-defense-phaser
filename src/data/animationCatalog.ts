export type AnimationCategory = 'tower' | 'enemy' | 'mercenary' | 'drone'
export type AnimationStatus = 'available' | 'planned'
export type AnimationMotion = 'pulse' | 'recoil' | 'arc' | 'scan' | 'launch' | 'gravity' | 'nano' | 'rewrite' | 'walk' | 'fly' | 'attack' | 'bomb' | 'death' | 'glitch' | 'burst'

export interface AnimationCatalogEntry {
  id: string
  category: AnimationCategory
  family: string
  name: string
  level: string
  action: string
  description: string
  timeline: string
  referenceImage: string
  previewAsset?: string
  status: AnimationStatus
  motion: AnimationMotion
  accent: string
  tags: readonly string[]
}

interface TowerForm {
  id: string
  family: string
  name: string
  level: string
  image: string
  motion: AnimationMotion
  accent: string
  attack: string
  timeline: string
  previewAsset?: string
}

const tower = (form: TowerForm): AnimationCatalogEntry => {
  const unitSpawner = form.family === '街头兵营' || form.family === '无人机巢'
  return {
    ...form,
    category: 'tower',
    action: unitSpawner ? '部署' : '攻击',
    description: unitSpawner
      ? `${form.name}本体保持待机，战斗表现完全由${form.family === '街头兵营' ? '佣兵小队' : '无人机编队'}的出动与攻击承担。`
      : `${form.name}发动“${form.attack}”。动作轮廓、蓄能方式和打击反馈必须直接对应名称与战斗定位。`,
    referenceImage: form.image,
    status: form.previewAsset ? 'available' : 'planned',
    tags: [form.family, form.level, form.attack],
  }
}

const towerForms: TowerForm[] = [
  {id:'rail-l1',family:'磁轨狙击',name:'磁轨狙击',level:'Lv1',image:'/assets/towers/generated-raw-selected/tower-01-magnetic-rail-base-cutout.png',previewAsset:'/assets/animations/towers/tower-01-magnetic-rail-attack.webp',motion:'recoil',accent:'#34c9ff',attack:'单轨狙击',timeline:'0.35秒磁轨充能 → 0.08秒蓝白贯穿束 → 0.42秒后坐复位'},
  {id:'rail-l2',family:'磁轨狙击',name:'磁轨校准台',level:'Lv2',image:'/assets/generated/progression/tier-2/mag-rail-tier-2.png',motion:'recoil',accent:'#34c9ff',attack:'校准穿刺',timeline:'瞄准环双重收束 → 轨道校准闪光 → 高速穿刺 → 稳定器回正'},
  {id:'rail-l3',family:'磁轨狙击',name:'双极加速炮',level:'Lv3',image:'/assets/generated/cutout/mag-rail-tier-3-2026-08-23T11-48-26-946Z.png',motion:'recoil',accent:'#63d9ff',attack:'双极加速',timeline:'双轨交替点亮 → 电容并联放电 → 粗重贯穿束 → 双臂吸收后坐'},
  {id:'rail-a',family:'磁轨狙击',name:'天穹裁决者',level:'Lv4-A',image:'/assets/generated/cutout/mag-rail-sky-verdict-2026-08-23T11-25-23-710Z.png',motion:'burst',accent:'#8be9ff',attack:'天穹裁决',timeline:'锁定空域 → 双目标标线 → 高空裁决束贯穿 → 云层电离残光'},
  {id:'rail-b',family:'磁轨狙击',name:'量子贯城炮',level:'Lv4-B',image:'/assets/generated/cutout/mag-rail-city-piercer-2026-08-23T11-25-22-347Z.png',motion:'recoil',accent:'#9a7dff',attack:'贯城炮击',timeline:'量子核心压缩 → 炮身锁死 → 四段贯穿冲击 → 地面震波与热雾'},

  {id:'arc-l1',family:'电弧塔',name:'电弧塔',level:'Lv1',image:'/assets/towers/generated-raw-selected/tower-02-arc-neon-base-cutout-1.png',previewAsset:'/assets/animations/towers/tower-02-arc-neon-attack.webp',motion:'arc',accent:'#20f4e6',attack:'三段电弧',timeline:'线圈升压 → 主电弧击中 → 两次分叉跳跃 → 余电消散'},
  {id:'arc-l2',family:'电弧塔',name:'高压电弧站',level:'Lv2',image:'/assets/generated/progression/tier-2/arc-neon-tier-2.png',motion:'arc',accent:'#20f4e6',attack:'高压连锁',timeline:'多线圈同步升压 → 青白电弧桥 → 三目标连锁 → 绝缘环降温'},
  {id:'arc-l3',family:'电弧塔',name:'霓虹电网核',level:'Lv3',image:'/assets/generated/cutout/arc-neon-tier-3-2026-08-23T11-49-31-954Z.png',motion:'arc',accent:'#5affeb',attack:'电网脉冲',timeline:'核心旋转 → 环形电网展开 → 三路电弧同时捕获 → 网络收束'},
  {id:'arc-a',family:'电弧塔',name:'霓虹雷暴核',level:'Lv4-A',image:'/assets/generated/cutout/arc-neon-storm-core-2026-08-23T11-25-45-551Z.png',motion:'burst',accent:'#6efff3',attack:'五链雷暴',timeline:'六线圈风暴蓄能 → 五目标连续雷击 → 核心过载闪白 → 蒸汽冷却'},
  {id:'arc-b',family:'电弧塔',name:'超导潮汐塔',level:'Lv4-B',image:'/assets/generated/cutout/arc-neon-superconductor-2026-08-23T11-25-37-154Z.png',motion:'arc',accent:'#55ffc2',attack:'超导潮汐',timeline:'冷却液加速 → 低矮环形电潮扩散 → 潮湿目标共振 → 绿色场域驻留'},

  {id:'merc-l1',family:'街头兵营',name:'街头兵营',level:'Lv1',image:'/assets/towers/generated-raw-selected/tower-03-mercenary-outpost-base-cutout.png',motion:'launch',accent:'#c99245',attack:'佣兵出动',timeline:'塔体保持静止 → 佣兵在集结点接敌 → 小队成员独立开火 → 命中反馈'},
  {id:'merc-l2',family:'街头兵营',name:'铬街前哨',level:'Lv2',image:'/assets/generated/progression/tier-2/mercenary-tier-2.png',motion:'launch',accent:'#dda85b',attack:'前哨增援',timeline:'侧门解锁 → 盾兵先行 → 步枪兵跟进 → 铬钢门闭合'},
  {id:'merc-l3',family:'街头兵营',name:'战术承包营',level:'Lv3',image:'/assets/generated/cutout/mercenary-tier-3-2026-08-23T12-04-52-610Z.png',motion:'launch',accent:'#e2b66c',attack:'承包队部署',timeline:'中央指挥室标记路线 → 双侧掩体开火 → 战术小队快速集结'},
  {id:'merc-a',family:'街头兵营',name:'铬钢不破营',level:'Lv4-A',image:'/assets/generated/cutout/mercenary-chrome-fortress-2026-08-23T11-25-49-027Z.png',motion:'burst',accent:'#f1c784',attack:'不破防线',timeline:'护墙锁定 → 三名重装佣兵列阵 → 盾击与齐射 → 医疗模块脉冲'},
  {id:'merc-b',family:'街头兵营',name:'血刃夜行队',level:'Lv4-B',image:'/assets/generated/cutout/mercenary-night-blades-2026-08-23T11-25-52-392Z.png',motion:'attack',accent:'#ff4d62',attack:'夜行处决',timeline:'红色警戒灯熄灭 → 隐身投影闪烁 → 双人高速突进 → 血红刃光处决'},

  {id:'hack-l1',family:'黑客中继',name:'黑客中继',level:'Lv1',image:'/assets/towers/generated-raw-selected/tower-04-hacker-relay-base-cutout.png',previewAsset:'/assets/animations/towers/tower-04-hacker-relay-attack.webp',motion:'scan',accent:'#79ff9e',attack:'入侵扫描',timeline:'天线定向 → 绿色扫描环扩张 → 目标出现故障框 → 数据回流'},
  {id:'hack-l2',family:'黑客中继',name:'入侵中继站',level:'Lv2',image:'/assets/generated/progression/tier-2/hacker-tier-2.png',motion:'scan',accent:'#79ff9e',attack:'多频入侵',timeline:'双频段同步 → 两层扫描环扫过战场 → 多目标标记刷新'},
  {id:'hack-l3',family:'黑客中继',name:'深网控制台',level:'Lv3',image:'/assets/generated/cutout/hacker-tier-3-2026-08-23T11-53-44-631Z.png',motion:'glitch',accent:'#72ffbd',attack:'深网接管',timeline:'数据面板翻转 → 深网隧道开启 → 目标信号扭曲 → 控制链闭合'},
  {id:'hack-a',family:'黑客中继',name:'零日统御台',level:'Lv4-A',image:'/assets/generated/cutout/hacker-zero-day-control-2026-08-23T11-11-56-802Z.png',motion:'scan',accent:'#52ff9b',attack:'零日统御',timeline:'多频桅杆全亮 → 全场扫描环推进 → 联网目标集体停顿 → 零日标记驻留'},
  {id:'hack-b',family:'黑客中继',name:'黑冰崩解器',level:'Lv4-B',image:'/assets/generated/cutout/hacker-black-ice-breaker-2026-08-23T11-13-18-369Z.png',motion:'glitch',accent:'#d44bff',attack:'黑冰崩解',timeline:'黑冰核心压暗 → 紫红定向脉冲 → 护盾像素化崩裂 → 危险代码燃烧'},

  {id:'drone-l1',family:'无人机巢',name:'无人机巢',level:'Lv1',image:'/assets/towers/generated-raw-selected/tower-05-drone-hive-base-new-drones.png',motion:'launch',accent:'#e8ffff',attack:'双机出击',timeline:'巢体保持静止 → 两架无人机离巢 → 分别锁定目标 → 俯冲攻击后返航'},
  {id:'drone-l2',family:'无人机巢',name:'蜂群发射巢',level:'Lv2',image:'/assets/generated/progression/tier-2/drone-tier-2.png',motion:'launch',accent:'#d9ffff',attack:'蜂群截击',timeline:'发射轨点亮 → 双机弹射 → 空中编队转向 → 交叉射击'},
  {id:'drone-l3',family:'无人机巢',name:'自律蜂群母站',level:'Lv3',image:'/assets/generated/cutout/drone-tier-3-2026-08-23T11-55-02-046Z.png',motion:'fly',accent:'#c9ffff',attack:'自律追猎',timeline:'雷达扫描 → 无人机自主分离 → 高速追击 → 回收臂接驳'},
  {id:'drone-a',family:'无人机巢',name:'蜂后制空母巢',level:'Lv4-A',image:'/assets/generated/cutout/drone-queen-air-carrier-2026-08-23T11-26-55-854Z.png',motion:'fly',accent:'#f0ffff',attack:'蜂后制空',timeline:'三舱同步开启 → 三架截击机升空 → 空中三角编队 → 高速制空齐射'},
  {id:'drone-b',family:'无人机巢',name:'蜂群湮灭工厂',level:'Lv4-B',image:'/assets/generated/cutout/drone-swarm-annihilator-2026-08-23T11-15-14-016Z.png',motion:'bomb',accent:'#ff7848',attack:'湮灭轰炸',timeline:'装配臂挂载炸弹 → 双机低空出厂 → 俯冲投弹 → 橙红范围爆炸'},

  {id:'gravity-l1',family:'重力钉',name:'重力钉',level:'Lv1',image:'/assets/towers/new-concepts/simplified/gravity-nail-level-1.png',motion:'gravity',accent:'#8f7dff',attack:'重力脉冲',timeline:'钉体下沉 → 紫蓝场线收缩 → 小范围牵引 → 敌人路径回退'},
  {id:'gravity-l2',family:'重力钉',name:'重力钉 II',level:'Lv2',image:'/assets/towers/new-concepts/simplified/gravity-nail-level-2.png',motion:'gravity',accent:'#927fff',attack:'增强牵引',timeline:'双环反转 → 引力井展开 → 四目标聚拢 → 地面波纹收束'},
  {id:'gravity-l3',family:'重力钉',name:'重力钉 III',level:'Lv3',image:'/assets/towers/new-concepts/simplified/gravity-nail-level-3.png',motion:'gravity',accent:'#a28fff',attack:'多点坍缩',timeline:'核心升起 → 五条场线锁定 → 同步路径回拉 → 稳定器复位'},
  {id:'gravity-a',family:'重力钉',name:'深井封锁',level:'Lv4-A',image:'/assets/towers/new-concepts/simplified/gravity-nail-level-4-deep-well-lockdown.png',motion:'gravity',accent:'#765cff',attack:'深井封锁',timeline:'地面形成深色井口 → 七目标向中心拖拽 → 重力环锁死 → 慢速场驻留'},
  {id:'gravity-b',family:'重力钉',name:'天幕偏转',level:'Lv4-B',image:'/assets/towers/new-concepts/simplified/gravity-nail-level-4-sky-deflection.png',motion:'gravity',accent:'#58c8ff',attack:'天幕偏转',timeline:'上方场幕展开 → 飞行轨迹弯折 → 目标换线偏转 → 天幕波纹消散'},

  {id:'grey-l1',family:'灰潮解构站',name:'灰潮解构站',level:'Lv1',image:'/assets/towers/new-concepts/revised/grey-tide-level-1.png',motion:'nano',accent:'#a8c6bd',attack:'纳米侵蚀',timeline:'罐体阀门开启 → 灰色纳米雾喷出 → 装甲表面像素剥落'},
  {id:'grey-l2',family:'灰潮解构站',name:'灰潮解构站 II',level:'Lv2',image:'/assets/towers/new-concepts/revised/grey-tide-level-2.png',motion:'nano',accent:'#b8d9cc',attack:'解构扩散',timeline:'双罐增压 → 灰潮扇面扩散 → 五目标出现腐蚀网格'},
  {id:'grey-l3',family:'灰潮解构站',name:'灰潮解构站 III',level:'Lv3',image:'/assets/towers/new-concepts/revised/grey-tide-level-3.png',motion:'nano',accent:'#c0e3d4',attack:'灰潮覆盖',timeline:'主管线震动 → 纳米潮覆盖大范围 → 护甲与能抗标记同时下降'},
  {id:'grey-a',family:'灰潮解构站',name:'噬甲集群',level:'Lv4-A',image:'/assets/towers/new-concepts/revised/grey-tide-level-4-armor-eater-swarm.png',motion:'nano',accent:'#aaffc7',attack:'噬甲风暴',timeline:'集群舱开启 → 八路纳米群附着 → 装甲层逐块消失 → 易伤标记亮起'},
  {id:'grey-b',family:'灰潮解构站',name:'清道夫协议',level:'Lv4-B',image:'/assets/towers/new-concepts/revised/grey-tide-level-4-scavenger-protocol.png',motion:'nano',accent:'#ffd85f',attack:'清道夫回收',timeline:'扫描残血目标 → 纳米线切割 → 目标解体 → 金色资源粒子回收'},

  {id:'rewrite-l1',family:'轨迹回写器',name:'轨迹回写器',level:'Lv1',image:'/assets/towers/new-concepts/revised/trajectory-rewriter-level-1.png',motion:'rewrite',accent:'#ff6fd8',attack:'轨迹复写',timeline:'门环记录目标 → 伤害发生 → 0.8秒后影像倒放并复写30%伤害'},
  {id:'rewrite-l2',family:'轨迹回写器',name:'轨迹回写器 II',level:'Lv2',image:'/assets/towers/new-concepts/revised/trajectory-rewriter-level-2.png',motion:'rewrite',accent:'#ff77dd',attack:'延迟回滚',timeline:'双环反向旋转 → 目标残影后退 → 0.7秒后复写40%伤害'},
  {id:'rewrite-l3',family:'轨迹回写器',name:'轨迹回写器 III',level:'Lv3',image:'/assets/towers/new-concepts/revised/trajectory-rewriter-level-3.png',motion:'rewrite',accent:'#ff82e7',attack:'双目标回写',timeline:'主环分裂两道记录框 → 双目标回退 → 0.6秒后同步复写50%伤害'},
  {id:'rewrite-a',family:'轨迹回写器',name:'回滚节点',level:'Lv4-A',image:'/assets/towers/new-concepts/revised/trajectory-rewriter-level-4-rollback-node.png',motion:'rewrite',accent:'#d77cff',attack:'节点回滚',timeline:'三重节点锁定 → 三目标路径倒放28单位 → 0.5秒后复写60%伤害'},
  {id:'rewrite-b',family:'轨迹回写器',name:'断点处决',level:'Lv4-B',image:'/assets/towers/new-concepts/revised/trajectory-rewriter-level-4-breakpoint-execution.png',motion:'glitch',accent:'#ff3ea5',attack:'断点处决',timeline:'红色断点框锁定 → 目标动作冻结一帧 → 阈值判定 → 数据切断或伤害复写'},
]

const enemyData = [
  ['gang','帮派义体兵','/assets/enemies/generated-raw-selected/enemy-01-gang-cyborg-base-cutout.png','#ff5b65','义体冲锋','手枪点射与义体挥击'],
  ['riot','防暴镇压机','/assets/enemies/generated-raw-selected/enemy-02-riot-mech-base-cutout.png','#ff9b55','重装踏步','盾击与镇压炮'],
  ['ninja','相位忍者','/assets/enemies/generated-raw-selected/enemy-03-phase-ninja-base-cutout.png','#c87cff','相位疾走','瞬移斩击'],
  ['aerostat','企业浮空艇','/assets/enemies/generated-raw-selected/enemy-04-corporate-airship-base-cutout.png','#78dfff','悬浮巡航','机腹压制脉冲'],
  ['devourer','数据吞噬者','/assets/enemies/generated-raw-selected/enemy-05-data-devourer-base-cutout.png','#77ffb6','数据爬行','护盾吞噬脉冲'],
  ['faraday','电磁镇暴体','/assets/enemies/new/enemy-06-electromagnetic-riot.png','#ffe56d','磁靴重踏','电磁震荡拳'],
  ['hijacker','劫持浮游体','/assets/enemies/new/enemy-07-hijack-hovercraft.png','#63e8ff','欺骗巡航','链路劫持波'],
  ['neurohound','神经猎犬','/assets/enemies/new/enemy-08-neuro-hound.png','#ff4f73','痛觉超频疾走','扑咬与神经电弧'],
  ['matriarch','育质母体','/assets/enemies/new/enemy-09-tissue-matriarch.png','#78ff8e','组织脉动爬行','组织灌注脉冲'],
  ['bonebreaker','骨铠破障兽','/assets/enemies/new/enemy-10-bonebreaker.png','#66e8ff','骨铠重踏','破障冲撞与骨铠震击'],
  ['enforcer','执法者·零号','/assets/enemies/boss-01-enforcer-zero-cutout.png','#ff4f74','重型推进','盾牌冲撞与导弹齐射'],
  ['adam-smasher','亚当·重锤','/assets/enemies/adam-smasher.png','#ff364f','装甲重踏','臂炮齐射与近身重击'],
  ['eve','夏娃-9','/assets/enemies/mother-city-eve-9-clean-no-white.png','#ff62d3','节点迁移','核心城市脉冲'],
] as const
const existingMove: Record<string,string>={gang:'/assets/animations/enemies/enemy-01-gang-cyborg-move.webp',riot:'/assets/animations/enemies/enemy-02-riot-mech-move.webp',ninja:'/assets/animations/enemies/enemy-03-phase-ninja-move.webp',aerostat:'/assets/animations/enemies/enemy-04-corporate-airship-fly.webp',devourer:'/assets/animations/enemies/enemy-05-data-devourer-move.webp',neurohound:'/assets/animations/enemies/enemy-08-neuro-hound-move.webp',matriarch:'/assets/animations/enemies/enemy-09-tissue-matriarch-move.webp',bonebreaker:'/assets/animations/enemies/enemy-10-bonebreaker-move.webp'}
const existingAttack: Record<string,string>={neurohound:'/assets/animations/enemies/enemy-08-neuro-hound-attack.webp',matriarch:'/assets/animations/enemies/enemy-09-tissue-matriarch-attack.webp',bonebreaker:'/assets/animations/enemies/enemy-10-bonebreaker-attack.webp'}
const existingDeath: Record<string,string>={neurohound:'/assets/animations/enemies/enemy-08-neuro-hound-death.webp',matriarch:'/assets/animations/enemies/enemy-09-tissue-matriarch-death.webp',bonebreaker:'/assets/animations/enemies/enemy-10-bonebreaker-death.webp'}
const bossEnemyIds = new Set(['enforcer', 'adam-smasher', 'eve'])
const enemies: AnimationCatalogEntry[] = enemyData.flatMap(([id,name,image,accent,move,attack]) => [
  {id:`${id}-move`,category:'enemy',family:name,name,level:bossEnemyIds.has(id)?'Boss':'敌军',action:id==='aerostat'||id==='hijacker'?'飞行':'行走',description:`${name}的${move}循环，速度感、重量和轮廓必须符合单位身份。`,timeline:'接触地面/悬浮推进 → 重心转移 → 循环无跳帧',referenceImage:image,previewAsset:existingMove[id],status:existingMove[id]?'available':'planned',motion:id==='aerostat'||id==='hijacker'?'fly':'walk',accent,tags:[name,...(bossEnemyIds.has(id)?['Boss']:[]),'移动']},
  {id:`${id}-attack`,category:'enemy',family:name,name,level:bossEnemyIds.has(id)?'Boss':'敌军',action:'攻击',description:`${name}发动${attack}，必须保留该敌人的武器、体量与阵营特征。`,timeline:`锁定防线 → ${attack}前摇 → 命中反馈 → 收招`,referenceImage:image,previewAsset:existingAttack[id],status:existingAttack[id]?'available':'planned',motion:'attack',accent,tags:[name,...(bossEnemyIds.has(id)?['Boss']:[]),'攻击']},
  {id:`${id}-death`,category:'enemy',family:name,name,level:bossEnemyIds.has(id)?'Boss':'敌军',action:'死亡',description:`${name}被摧毁。机械单位爆出电火花与部件，生物/义体单位使用故障化倒地，不出现血腥表现。`,timeline:'受致命伤 → 核心失稳 → 轮廓故障/倒地 → 粒子消散',referenceImage:image,previewAsset:existingDeath[id],status:existingDeath[id]?'available':'planned',motion:'death',accent,tags:[name,...(bossEnemyIds.has(id)?['Boss']:[]),'死亡']},
])

const unit = (id:string,category:AnimationCategory,family:string,name:string,action:string,image:string,motion:AnimationMotion,accent:string,description:string):AnimationCatalogEntry=>({id,category,family,name,level:'单位',action,description,timeline:action==='死亡'?'受击失衡 → 装备火花 → 倒地/坠落 → 信标熄灭':action==='攻击'||action==='轰炸'?'锁定 → 武器前摇 → 命中动作 → 复位':'启动 → 重心/高度循环 → 转向 → 无缝循环',referenceImage:image,status:'planned',motion,accent,tags:[family,name,action]})
const units: AnimationCatalogEntry[]=[
  unit('merc-shield-walk','mercenary','街头兵营佣兵','铬钢盾兵','行走','/assets/units/mercenary-shield.png','walk','#d4a75c','持盾低姿推进，盾牌始终面向敌人。'),
  unit('merc-shield-attack','mercenary','街头兵营佣兵','铬钢盾兵','攻击','/assets/units/mercenary-shield.png','attack','#d4a75c','盾击接短点射，动作厚重并能表现拦截。'),
  unit('merc-shield-death','mercenary','街头兵营佣兵','铬钢盾兵','死亡','/assets/units/mercenary-shield.png','death','#d4a75c','盾牌先落地，佣兵跪倒，战术信标进入8秒复活倒计时。'),
  unit('merc-rifle-walk','mercenary','街头兵营佣兵','街头步枪兵','行走','/assets/units/mercenary-rifle.png','walk','#e4b76c','步枪贴肩、小步快速推进，保持可随时开火的姿势。'),
  unit('merc-rifle-attack','mercenary','街头兵营佣兵','街头步枪兵','攻击','/assets/units/mercenary-rifle.png','attack','#e4b76c','两到三发短点射，枪口焰和后坐清晰。'),
  unit('merc-rifle-death','mercenary','街头兵营佣兵','街头步枪兵','死亡','/assets/units/mercenary-rifle.png','death','#e4b76c','中弹踉跄倒地，武器滑落，信标熄灭。'),
  unit('merc-blade-walk','mercenary','街头兵营佣兵','血刃夜行者','行走','/assets/generated/cutout/street-mercenary-unit-2026-08-23T12-16-30-502Z.png','walk','#ff4d62','低姿隐身疾走，红色轮廓间歇闪现。'),
  unit('merc-blade-attack','mercenary','街头兵营佣兵','血刃夜行者','攻击','/assets/generated/cutout/street-mercenary-unit-2026-08-23T12-16-30-502Z.png','attack','#ff4d62','短距突进后双刃交叉斩击，符合夜行处决定位。'),
  unit('merc-blade-death','mercenary','街头兵营佣兵','血刃夜行者','死亡','/assets/generated/cutout/street-mercenary-unit-2026-08-23T12-16-30-502Z.png','death','#ff4d62','隐身模块故障闪烁后倒地，不使用夸张血液。'),
  unit('drone-scout-fly','drone','无人机单位','截击无人机','飞行','/assets/towers/drone-hive-unit-tight.png','fly','#dfffff','高速悬停与小幅侧倾，转向由机翼矢量喷口完成。'),
  unit('drone-scout-bomb','drone','无人机单位','截击无人机','轰炸','/assets/towers/drone-hive-unit-tight.png','bomb','#dfffff','俯冲锁定后发射微型弹药并快速拉升。'),
  unit('drone-scout-death','drone','无人机单位','截击无人机','死亡','/assets/towers/drone-hive-unit-tight.png','death','#dfffff','机翼失稳旋转、拖出电火花后坠落爆裂。'),
  unit('drone-bomber-fly','drone','无人机单位','爆破无人机','飞行','/assets/generated/cutout/drone-hive-unit-2026-08-23T23-59-59-999Z.png','fly','#ff995f','挂载炸弹后的沉重低空飞行，机体摆幅更小。'),
  unit('drone-bomber-bomb','drone','无人机单位','爆破无人机','轰炸','/assets/generated/cutout/drone-hive-unit-2026-08-23T23-59-59-999Z.png','bomb','#ff7848','打开弹舱、释放重型载荷，地面形成橙红范围冲击。'),
  unit('drone-bomber-death','drone','无人机单位','爆破无人机','死亡','/assets/generated/cutout/drone-hive-unit-2026-08-23T23-59-59-999Z.png','death','#ff7848','载荷殉爆，装甲壳向外崩开并快速淡出。'),
  unit('drone-queen-fly','drone','无人机单位','蜂后指挥机','飞行','/assets/towers/drone-hive-unit-generated.png','fly','#8beeff','稳定高位悬浮，雷达与导航灯持续扫描。'),
  unit('drone-queen-bomb','drone','无人机单位','蜂后指挥机','轰炸','/assets/towers/drone-hive-unit-generated.png','bomb','#8beeff','向目标投射制导标记，并指挥僚机同步攻击。'),
  unit('drone-queen-death','drone','无人机单位','蜂后指挥机','死亡','/assets/towers/drone-hive-unit-generated.png','death','#8beeff','指挥链故障、导航灯转红，机体失控坠落。'),
]

const towerAttackDisabledFamilies = new Set(['街头兵营', '无人机巢', '重力钉', '灰潮解构站', '轨迹回写器'])
const towerAttackForms = towerForms.filter((form) => !towerAttackDisabledFamilies.has(form.family))

export const ANIMATION_CATALOG: readonly AnimationCatalogEntry[]=[...towerAttackForms.map(tower),...enemies,...units]
export const ANIMATION_CATEGORY_LABEL:Record<AnimationCategory,string>={tower:'防御塔攻击',enemy:'怪物动画',mercenary:'佣兵动画',drone:'无人机动画'}
