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
  | 'enforcer'
  | 'eve'
  | 'mag-rail-sniper'
  | 'street-mercenary'
  | 'drone-hive'
  | 'arc-neon'
  | 'hacker-relay'

export const VOICE_COOLDOWN_MS = 20000

export const VOICE_CATALOG: Record<VoiceCategory, Record<string, string[]>> = {
  lan: {
    opening: ['lan/opening.mp3'],
    wave: ['lan/enemy_incoming.mp3'],
    finalWave: ['lan/final_wave.mp3'],
    damage: ['lan/fortress_damaged.mp3', 'lan/node_attacked.mp3'],
    routeSplit: ['lan/route_split.mp3'],
    victory: ['lan/victory.mp3'],
    defeat: ['lan/defeat.mp3'],
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
    spawn: ['corp_airship/area_locked.mp3', 'corp_airship/clear_resistance.mp3', 'corp_airship/drop_countdown.mp3'],
  },
  devourer: {
    spawn: ['data_devourer/open_port.mp3', 'data_devourer/strip_access.mp3', 'data_devourer/memory_belongs.mp3'],
  },
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
    entrance: ['eve_9/entrance.mp3'],
    node: ['eve_9/invade_node.mp3', 'eve_9/lock_tower.mp3'],
    transfer: ['eve_9/transfer_body.mp3'],
    final: ['eve_9/final_phase.mp3', 'eve_9/core_revealed.mp3'],
    defeated: ['eve_9/defeated.mp3'],
    playerDefeat: ['eve_9/player_defeat.mp3'],
  },
  'mag-rail-sniper': {
    build: ['gray_falcon/build.mp3'],
    select: ['gray_falcon/select.mp3'],
    upgrade: ['gray_falcon/upgrade.mp3'],
    combat: ['gray_falcon/skill_charge.mp3', 'gray_falcon/skill_fire.mp3', 'gray_falcon/multi_pierce.mp3'],
    kill: ['gray_falcon/elite_kill.mp3'],
    blocked: ['gray_falcon/jammed.mp3'],
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
    build: ['queen_bee/build.mp3'],
    select: ['queen_bee/select.mp3'],
    upgrade: ['queen_bee/anti_air_mode.mp3', 'queen_bee/bomb_mode.mp3', 'queen_bee/repair_mode.mp3'],
    combat: ['queen_bee/skill.mp3'],
    down: ['queen_bee/drone_destroyed.mp3'],
    dismantle: ['queen_bee/return.mp3'],
  },
  'arc-neon': {
    build: ['spark/build.mp3'],
    select: ['spark/select.mp3'],
    upgrade: ['spark/upgrade.mp3'],
    combat: ['spark/chain_attack.mp3', 'spark/skill.mp3', 'spark/wet_target.mp3'],
    kill: ['spark/mechanical_kill.mp3'],
    dismantle: ['spark/shutdown.mp3'],
  },
  'hacker-relay': {
    build: ['zero_day/build.mp3'],
    select: ['zero_day/select.mp3'],
    upgrade: ['zero_day/capture_node.mp3', 'zero_day/control_enemy.mp3'],
    combat: ['zero_day/skill.mp3', 'zero_day/break_shield.mp3'],
    kill: ['zero_day/data_kill.mp3'],
    blocked: ['zero_day/hack_failed.mp3'],
  },
}

/** 语音归类 -> 音乐闪避(ducking) classId,原 voice-system.js 内联判断逻辑 */
export function voiceClassId(category: VoiceCategory, event: string): string {
  if (category === 'enforcer' || category === 'eve') return 'boss_mechanic'
  if (category === 'lan' && ['wave', 'finalWave', 'damage', 'routeSplit', 'defeat'].includes(event)) return 'battle_warning'
  if (['mag-rail-sniper', 'arc-neon', 'street-mercenary', 'hacker-relay', 'drone-hive'].includes(category)) return 'tactical_feedback'
  if (['gang', 'riot', 'ninja', 'aerostat', 'devourer'].includes(category)) return 'enemy_bark'
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
