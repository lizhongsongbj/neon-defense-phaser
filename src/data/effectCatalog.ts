export type EffectCategory = 'core' | 'synergy' | 'enemy-death' | 'mercenary-death' | 'drone-death'
export type EffectMotion = 'particles' | 'beam' | 'arc' | 'burst' | 'shockwave' | 'dissolve' | 'glitch' | 'smoke' | 'shield' | 'scan' | 'trail' | 'shards'

export interface EffectCatalogEntry {
  id: string
  category: EffectCategory
  family: string
  name: string
  motion: EffectMotion
  accent: string
  secondary: string
  description: string
  timeline: string
  layers: readonly string[]
  tags: readonly string[]
  remnantAsset?: string
}

const effect = (
  id: string,
  category: EffectCategory,
  family: string,
  name: string,
  motion: EffectMotion,
  accent: string,
  secondary: string,
  description: string,
  timeline: string,
  layers: readonly string[],
): EffectCatalogEntry => ({ id, category, family, name, motion, accent, secondary, description, timeline, layers, tags: [category, family, name, motion, ...layers] })

const coreEffects: EffectCatalogEntry[] = [
  effect('fx-hacker-head-pulse','core','黑客中继','塔头电磁脉冲','shockwave','#79ff9e','#c9ffe0','从中继塔头发射的写实电磁脉冲，使用高亮能量核、双层扫描环和少量电离火花。','塔头蓄能 → 青绿核闪光 → 双层脉冲环扩散 → 电离余光消退',['塔头能量核','双层体积脉冲环','电离火花','轻微空气扰动']),
  effect('fx-hit-kinetic','core','通用命中','动能火花','particles','#ffd36a','#ff7347','用于子弹、弹片和近战命中的短促金属火花。','接触闪点 → 锥形火花散射 → 暗红余烬熄灭',['命中闪光','火花粒子','余烬']),
  effect('fx-hit-energy','core','通用命中','能量灼点','burst','#66f7ff','#5a78ff','用于电弧、脉冲和能量弹命中的青白灼烧反馈。','核心过曝 → 能量环扩散 → 电离残光消退',['过曝核心','辉光环','电离雾']),
  effect('fx-beam-cyan','core','通用光束','青白贯穿束','beam','#7cffff','#20a8ff','适用于磁轨、激光与校准射线的高速直线光束。','前端聚焦 → 主束贯穿 → 细线残影衰减',['主光束','内核高光','尾迹']),
  effect('fx-beam-amber','core','通用光束','琥珀切割束','beam','#ffd45c','#ff6c35','适用于工业切割、拆解和回收类装备。','定位线亮起 → 热切割束稳定 → 熔融粒子滴落',['定位线','热光束','熔融粒子']),
  effect('fx-electric-chain','core','通用电弧','连锁电弧','arc','#63fff2','#9180ff','多目标之间跳跃的分叉电流，可作为电弧塔和系统过载效果。','主电弧命中 → 两次分叉跳跃 → 余电游走',['主电弧','分叉线','电火花']),
  effect('fx-pulse-ring','core','通用场域','脉冲震荡环','shockwave','#55ecff','#ff4cab','适用于范围伤害、扫描、重力和状态释放。','中心压缩 → 双环扩散 → 边缘消隐',['中心闪点','双层环','空气扰动']),
  effect('fx-particles-nano','core','纳米科技','灰潮纳米粒子','particles','#b7d1c5','#6d8f7f','灰绿色微粒群，用于解构、削甲和材料回收。','微粒喷出 → 表面附着 → 像素化剥离',['纳米点群','腐蚀网格','剥落碎片']),
  effect('fx-particles-coins','core','资源反馈','资源回收粒子','particles','#ffe36e','#ff9c32','击杀奖励、清道夫协议和拆除返还的金色数据粒子。','资源标记亮起 → 金色粒子归拢 → 计量闪光',['金币粒子','吸附轨迹','计量闪光']),
  effect('fx-shield-break','core','护盾系统','六边护盾破裂','shield','#7ceaff','#3968ff','护盾耗尽时的六边形裂纹与碎片爆散。','护盾过载 → 六边裂纹扩张 → 蓝色碎片消散',['护盾膜','裂纹','六边碎片']),
  effect('fx-armor-shred','core','状态效果','护甲削弱','shards','#aaffc7','#64766e','用机械碎片和灰绿色扫描线表达护甲被拆解。','扫描锁定 → 装甲片剥落 → 削甲标记驻留',['扫描线','零件残留','状态标记']),
  effect('fx-phase-reveal','core','状态效果','相位显形','scan','#82ffad','#39cfff','揭露隐身和相位目标的绿色扫描框。','轮廓扫描 → 残影归一 → 实体锁定',['扫描框','残影','锁定角标']),
  effect('fx-execute','core','处决反馈','断点切断','glitch','#ff416f','#ffb14a','低生命处决时使用的红色阈值框和数据断裂。','阈值框收紧 → 一帧冻结 → 信号断裂',['阈值框','故障切片','断裂粒子']),
  effect('fx-explosion-small','core','通用爆炸','紧凑爆破','burst','#ffb24b','#ff493d','无人机弹药、部件爆破与小型范围攻击使用。','白热核心 → 橙红冲击 → 黑烟碎屑',['白热核心','火焰瓣','烟尘']),
  effect('fx-trail-flight','core','运动尾迹','高速飞行尾迹','trail','#82f7ff','#ff6eb5','适用于无人机、浮空敌人与高速投射物。','推进器点亮 → 双线尾迹拉长 → 转向弧线淡出',['推进光','双尾迹','转向弧']),
]

const synergyEffects: EffectCatalogEntry[] = [
  effect('fx-synergy-overload','synergy','普通连携','超载坍缩','shockwave','#7f70ff','#4dfff1','紫蓝引力井被青白电弧引爆，形成压缩后外放的双阶段冲击。','引力收缩 → 电弧贯入 → 青紫火花喷射爆发',['引力井','电弧','火花喷射']),
  effect('fx-synergy-zero-day','synergy','普通连携','零日穿透','beam','#61ffb7','#59b8ff','绿色漏洞标记与蓝色磁轨束叠加的精准贯穿特效。','漏洞框锁定 → 磁轨束贯穿 → 绿色代码碎裂',['漏洞框','贯穿束','代码碎片']),
  effect('fx-synergy-chrome','synergy','普通连携','铬街收割','shards','#d7b16c','#ff4f57','灰潮削甲后接入佣兵金红交叉火力。','装甲剥落 → 交叉弹道 → 红金血滴抛散',['削甲碎片','交叉弹道','血滴抛散']),
  effect('fx-synergy-swarm','synergy','普通连携','蜂群回声','trail','#ff72dc','#72eaff','回写门复制无人机攻击路径，形成粉紫与青色双重轨迹。','蜂群锁定 → 轨迹复制 → 延迟回声爆点',['蜂群尾迹','回写残影','回声爆点']),
  effect('fx-ultimate-blackout','synergy','终极连携','城市断电协议','burst','#24f4e5','#9d69ff','全场压暗后重力、电弧、黑客扫描同时爆发。','环境降亮 → 三类标记汇聚 → 全域青紫爆发',['暗场遮罩','标记汇聚','全域脉冲']),
  effect('fx-ultimate-breakpoint','synergy','终极连携','断点猎杀','beam','#ff3ea5','#8eeaff','断点框锁死目标，蜂群标记后由量子贯穿束完成处决。','断点锁定 → 蜂群三角标记 → 量子束处决',['断点框','蜂群标记','量子束']),
]

const enemyDeaths: Array<[string,string,EffectMotion,string,string,string]> = [
  ['gang','帮派义体兵','particles','#ff665e','#ffc16a','义体火花与小型零件散落，轮廓快速故障淡出。'],
  ['riot','防暴镇压机','shards','#ff9658','#ffe07a','厚重装甲片崩落，核心熄灭并伴随低矮烟尘。'],
  ['ninja','相位忍者','glitch','#c67dff','#ff72d8','紫色残影错位后切片消散，不保留实体尸体。'],
  ['aerostat','企业浮空艇','smoke','#75ddff','#ff9b55','推进器失火、拖出金属火花并向下坠落爆裂。'],
  ['devourer','数据吞噬者','dissolve','#72ffb2','#52bfff','绿色数据块由外向内崩解，护盾碎片先行破裂。'],
  ['faraday','电磁镇暴体','arc','#ffe26b','#55dfff','磁场失稳产生环形电弧，机体随后断电倒下。'],
  ['hijacker','劫持浮游体','glitch','#64e9ff','#ff62ce','伪装信号撕裂，浮游核心分成多层残影消失。'],
  ['neurohound','神经猎犬','particles','#ff596f','#9f72ff','神经灯带跳红，义体碎片沿奔跑方向飞散。'],
  ['matriarch','育质母体','dissolve','#ff82bc','#79ffbd','生物组织收缩后化为克制的荧光孢子，不出现血腥。'],
  ['bonebreaker','骨铠破障兽','shards','#e7d3ad','#ff784c','骨铠大块崩裂，重型躯体震地并扬起尘环。'],
  ['enforcer','执法者·零号','burst','#ff4772','#ffba58','Boss部件连续爆破，主核心过载后形成重型冲击波。'],
  ['eve','夏娃-9','glitch','#ff67d5','#77eaff','城市节点逐层断线，白色核心转为透明数据碎片消散。'],
]

const enemyDeathEffects = enemyDeaths.map(([id,name,motion,accent,secondary,description]) =>
  effect(`fx-enemy-death-${id}`,'enemy-death','怪物死亡',`${name}死亡`,motion,accent,secondary,description,'致命伤反馈 → 身份化崩解 → 残留粒子清除',['轮廓闪烁','身份粒子','消散']),
)

const mercenaryDeathEffects: EffectCatalogEntry[] = [
  effect('fx-merc-shield-death','mercenary-death','佣兵死亡','铬钢盾兵倒地','shards','#d7aa5c','#6deaff','盾牌先砸地擦出火花，身体失去支撑后倒地，地面留下少量血迹。','盾牌脱手 → 重心下沉 → 信标熄灭',['盾牌擦地火花','倒地动作','血迹残留']),
  effect('fx-merc-rifle-death','mercenary-death','佣兵死亡','街头步枪兵倒地','particles','#e6b96c','#ff7158','中弹踉跄、武器脱手并倒地；少量血滴抛散，最后留下血迹残留。','受击后仰 → 武器滑落 → 信标熄灭',['血滴抛散','身体倒地','血迹残留']),
  effect('fx-merc-blade-death','mercenary-death','佣兵死亡','血刃夜行者故障','glitch','#ff4d62','#ba68ff','隐身模块短暂失灵，身体倾倒并留下少量血滴，不使用光束或纯故障消失。','隐身闪烁 → 少量血滴 → 轮廓淡出',['失稳倒地','少量血滴','血迹残留']),
].map((entry) => ({ ...entry, remnantAsset: '/assets/effects/death-remnants/biological-blood-puddle.png', layers: [...entry.layers, '血迹残留'] }))

const droneDeathEffects: EffectCatalogEntry[] = [
  effect('fx-drone-scout-death','drone-death','无人机死亡','截击无人机坠毁','smoke','#8cefff','#ff9a50','无人机失稳下坠，机体撞击后爆裂，喷出金属与电气火花，烟雾散开并留下零件。','旋翼失速 → 金属火花喷射 → 紧凑爆裂',['失稳坠落','金属火花','烟雾与零件']),
  effect('fx-drone-bomber-death','drone-death','无人机死亡','爆破无人机殉爆','burst','#ff8b54','#ffd25d','载荷舱过热后在坠落中爆裂，外壳崩开，火花、烟尘与散落零件依次出现。','载荷过热 → 殉爆 → 零件与烟尘散开',['载荷爆裂','火花喷射','零件残留']),
  effect('fx-drone-queen-death','drone-death','无人机死亡','蜂后指挥机断链','glitch','#8beeff','#ff4b76','指挥链中断导致机体失稳，旋转坠落并撞击地面，电弧、烟尘和零件四散。','连接线报警 → 导航灯转红 → 数据断链坠落',['机体坠毁','电气火花','零件残留']),
].map((entry) => ({ ...entry, remnantAsset: '/assets/effects/death-remnants/mechanical-parts-pile.png', layers: [...entry.layers, '零件残留'] }))

export const EFFECT_CATALOG: readonly EffectCatalogEntry[] = [
  ...coreEffects,
  ...synergyEffects,
  ...enemyDeathEffects,
  ...mercenaryDeathEffects,
  ...droneDeathEffects,
]

export const EFFECT_CATEGORY_LABEL: Record<EffectCategory,string> = {
  core: '通用粒子/光束',
  synergy: '连携特效',
  'enemy-death': '怪物死亡',
  'mercenary-death': '佣兵死亡',
  'drone-death': '无人机死亡',
}


