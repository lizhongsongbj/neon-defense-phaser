export type SpecialEventTone = 'good' | 'bad'
export type SpecialEventId =
  | 'misrouted-cache'
  | 'grey-market-bid'
  | 'coolant-rain'
  | 'spectrum-sweep'
  | 'waste-heat-backflow'

export interface SpecialEventModifiers {
  coins?: number
  bountyMultiplier?: number
  towerTimeScale?: number
  enemySpeedScale?: number
}

export interface SpecialEventDefinition {
  id: SpecialEventId
  tone: SpecialEventTone
  title: string
  source: string
  description: string
  effectLabel: string
  durationSeconds: number
  modifiers: SpecialEventModifiers
}

/** Three favorable and two unfavorable street-level events. None directly changes base HP, wave count, or victory state. */
export const SPECIAL_EVENTS: readonly SpecialEventDefinition[] = [
  {
    id: 'misrouted-cache',
    tone: 'good',
    title: '街区错投补给',
    source: '幽灵物流网',
    description: '一架被抹除识别码的货运无人机，把未登记电池箱投进了防区。',
    effectLabel: '立即获得 28 G',
    durationSeconds: 0,
    modifiers: { coins: 28 },
  },
  {
    id: 'grey-market-bid',
    tone: 'good',
    title: '灰市回收竞价',
    source: '灰潮拆解商',
    description: '附近拆解商临时抬高义体残骸收购价，战场回收收益小幅提高。',
    effectLabel: '敌人赏金 +15%',
    durationSeconds: 12,
    modifiers: { bountyMultiplier: 1.15 },
  },
  {
    id: 'coolant-rain',
    tone: 'good',
    title: '冷却剂降雨',
    source: '上层管线泄露',
    description: '巨构上层的工业冷却剂短暂飘落，防御设备散热效率有所提升。',
    effectLabel: '防御塔攻击节奏 +12%',
    durationSeconds: 10,
    modifiers: { towerTimeScale: 1.12 },
  },
  {
    id: 'spectrum-sweep',
    tone: 'bad',
    title: '公司频谱扫荡',
    source: '企业安全局',
    description: '企业监听阵列扫过街区，防御网络被迫降低发射功率以隐藏坐标。',
    effectLabel: '防御塔攻击节奏 -10%',
    durationSeconds: 9,
    modifiers: { towerTimeScale: 0.9 },
  },
  {
    id: 'waste-heat-backflow',
    tone: 'bad',
    title: '废热逆流',
    source: '地下热交换井',
    description: '旧城区热交换井发生逆流，敌方义体在高温中进入短暂过载状态。',
    effectLabel: '敌人移动速度 +7%',
    durationSeconds: 8,
    modifiers: { enemySpeedScale: 1.07 },
  },
]

function eventHash(mapIndex: number, wave: number, salt: number) {
  let value = Math.imul(mapIndex + 11, 0x45d9f3b) ^ Math.imul(wave + 23, 0x119de1f3) ^ Math.imul(salt + 7, 0x27d4eb2d)
  value ^= value >>> 16
  return value >>> 0
}

/**
 * Events begin after wave 1, never repeat in one mission, and occur at most three times.
 * Even-numbered waves guarantee a check-in; odd waves remain uncommon.
 */
export function chooseSpecialEvent(
  mapIndex: number,
  wave: number,
  usedIds: ReadonlySet<SpecialEventId>,
  triggeredCount: number,
): SpecialEventDefinition | null {
  if (wave < 2 || triggeredCount >= 3) return null
  const seed = eventHash(mapIndex, wave, triggeredCount)
  if (wave % 2 !== 0 && seed % 100 >= 35) return null
  const available = SPECIAL_EVENTS.filter((event) => !usedIds.has(event.id))
  if (!available.length) return null
  return available[Math.floor(seed / 100) % available.length]
}

export function specialEventHistory(mapIndex: number, currentWave: number) {
  const usedIds = new Set<SpecialEventId>()
  let triggeredCount = 0

  for (let wave = 2; wave < currentWave; wave += 1) {
    const event = chooseSpecialEvent(mapIndex, wave, usedIds, triggeredCount)
    if (!event) continue
    usedIds.add(event.id)
    triggeredCount += 1
  }

  return { usedIds, triggeredCount }
}

export function specialEventTriggerDelay(mapIndex: number, wave: number) {
  return 3.5 + (eventHash(mapIndex, wave, 41) % 26) / 10
}
