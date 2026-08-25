/**
 * 语音播报清单 —— 原样迁移自 霓虹防线/voice-system.js 中的 catalog 常量。
 * 路径相对 `assets/audio/voices/`。
 */

export type VoiceCategory =
  | 'lan'
  | 'gang'
  | 'riot'
  | 'ninja'
  | 'aerostat'
  | 'devourer'
  | 'faraday'
  | 'hijacker'
  | 'neurohound'
  | 'matriarch'
  | 'bonebreaker'
  | 'enforcer'
  | 'eve'
  | 'mag-rail-sniper'
  | 'street-mercenary'
  | 'drone-hive'
  | 'arc-neon'
  | 'hacker-relay'

// Voice playback cooldown: 20 seconds
export const VOICE_COOLDOWN_MS = 20_000

export const VOICE_CATALOG: Record<VoiceCategory, Record<string, string[]>> = {
  lan: {
    opening: ['lan/opening.wav'],
    wave: ['lan/enemy_incoming.wav'],
    finalWave: ['lan/final_wave.wav'],
    damage: ['lan/fortress_damaged.wav', 'lan/node_attacked.wav'],
    routeSplit: ['lan/route_split.wav'],
    victory: ['lan/victory.wav'],
    defeat: ['lan/defeat.wav'],
  },
  gang: {
    spawn: ['gang_cyborg/charge.mp3', 'gang_cyborg/weak_firepower.mp3', 'gang_cyborg/bounty.mp3'],
  },
  riot: {
    spawn: ['riot_machine/lockdown.mp3', 'riot_machine/suppression_mode.mp3', 'riot_machine/get_down.mp3'],
  },
  ninja: {
    spawn: ['phase_ninja/target_ahead.mp3', 'phase_ninja/vision_cut.mp3'],
    phase: ['phase_ninja/invisible.mp3'],
  },
  aerostat: {
    spawn: ['corp_airship/area_locked.wav', 'corp_airship/clear_resistance.wav', 'corp_airship/drop_countdown.wav'],
  },
  devourer: {
    spawn: ['data_devourer/open_port.mp3', 'data_devourer/strip_access.mp3', 'data_devourer/memory_belongs.mp3'],
  },
  faraday: { spawn: ['faraday/alert.wav'] },
  hijacker: { spawn: ['hijacker/lock_on.wav'] },
  neurohound: { spawn: ['neurohound/roar.wav'] },
  matriarch: { spawn: ['matriarch/roar.wav'] },
  bonebreaker: { spawn: ['bonebreaker/roar.wav'] },
  enforcer: {
    entrance: ['enforcer_zero/entrance.mp3'],
    shield: ['enforcer_zero/shield_broken.mp3'],
    missiles: ['enforcer_zero/missile_destroyed.mp3'],
    thruster: ['enforcer_zero/thruster_destroyed.mp3'],
    enraged: ['enforcer_zero/enraged.mp3'],
    core: ['enforcer_zero/core_exposed.mp3'],
    defeated: ['enforcer_zero/defeated.mp3'],
  },
  eve: {
    entrance: ['eve_9/entrance.wav'],
    node: ['eve_9/invade_node.wav', 'eve_9/lock_tower.wav'],
    transfer: ['eve_9/transfer_body.wav'],
    final: ['eve_9/final_phase.wav', 'eve_9/core_revealed.wav'],
    defeated: ['eve_9/defeated.wav'],
    playerDefeat: ['eve_9/player_defeat.wav'],
  },
  'mag-rail-sniper': {
    build: ['gray_falcon/build.wav'],
    select: ['gray_falcon/select.wav'],
    upgrade: ['gray_falcon/upgrade.wav'],
    combat: ['gray_falcon/skill_charge.wav', 'gray_falcon/skill_fire.wav', 'gray_falcon/multi_pierce.wav'],
    kill: ['gray_falcon/elite_kill.wav'],
    blocked: ['gray_falcon/jammed.wav'],
  },
  'street-mercenary': {
    build: ['iron_fist/build.mp3'],
    select: ['iron_fist/select.mp3'],
    upgrade: ['iron_fist/shield_mode.mp3', 'iron_fist/blade_mode.mp3'],
    combat: ['iron_fist/intercept_elite.mp3', 'iron_fist/skill.mp3'],
    down: ['iron_fist/teammate_down.mp3'],
    dismantle: ['iron_fist/retreat.mp3'],
  },
  'drone-hive': {
    build: ['queen_bee/build.wav'],
    select: ['queen_bee/select.wav'],
    upgrade: ['queen_bee/anti_air_mode.wav', 'queen_bee/bomb_mode.wav', 'queen_bee/repair_mode.wav'],
    combat: ['queen_bee/skill.wav'],
    down: ['queen_bee/drone_destroyed.wav'],
    dismantle: ['queen_bee/return.wav'],
  },
  'arc-neon': {
    build: ['spark/build.wav'],
    select: ['spark/select.wav'],
    upgrade: ['spark/upgrade.wav'],
    combat: ['spark/chain_attack.wav', 'spark/skill.wav', 'spark/wet_target.wav'],
    kill: ['spark/mechanical_kill.wav'],
    dismantle: ['spark/shutdown.wav'],
  },
  'hacker-relay': {
    build: ['zero_day/build.wav'],
    select: ['zero_day/select.wav'],
    upgrade: ['zero_day/capture_node.wav', 'zero_day/control_enemy.wav'],
    combat: ['zero_day/skill.wav', 'zero_day/break_shield.wav'],
    kill: ['zero_day/data_kill.wav'],
    blocked: ['zero_day/hack_failed.wav'],
  },
}

/** 语音归类 -> 音乐闪避(ducking) classId,原 voice-system.js 内联判断逻辑 */
export function voiceClassId(category: VoiceCategory, event: string): string {
  if (category === 'enforcer' || category === 'eve') return 'boss_mechanic'
  if (category === 'lan' && ['wave', 'finalWave', 'damage', 'routeSplit', 'defeat'].includes(event)) return 'battle_warning'
  if (['mag-rail-sniper', 'arc-neon', 'street-mercenary', 'hacker-relay', 'drone-hive'].includes(category)) return 'tactical_feedback'
  if (['gang', 'riot', 'ninja', 'aerostat', 'devourer', 'faraday', 'hijacker', 'neurohound', 'matriarch', 'bonebreaker'].includes(category)) return 'enemy_bark'
  return 'character_flavor'
}

/** 遍历清单里的全部语音文件相对路径,用于 PreloadScene 批量加载 */
export function allVoiceFiles(): Array<{ key: string; path: string }> {
  const files: Array<{ key: string; path: string }> = []
  for (const [category, events] of Object.entries(VOICE_CATALOG)) {
    for (const [event, list] of Object.entries(events)) {
      list.forEach((file, index) => {
        files.push({ key: `voice-${category}-${event}-${index}`, path: `assets/audio/voices/${file}` })
      })
    }
  }
  return files
}
