/**
 * 背景音乐清单 —— 原样迁移自 霓虹防线/music-manifest.json。
 * 音轨文件相对 `assets/audio/music/`。
 */

export interface MusicTrack {
  id: string
  name: string
  file: string
  role: 'level' | 'boss'
  sceneId?: string
  bossId?: string
}

export const MUSIC_BUSES = {
  map: { gainDb: -10, fadeInSec: 0.8 },
  boss: { gainDb: -8, enterSec: 0.25, exitSec: 0.6 },
}

export const MUSIC_DUCKING: Record<string, { gainReductionDb: number; attackSec: number; releaseSec: number }> = {
  boss_mechanic: { gainReductionDb: 12, attackSec: 0.08, releaseSec: 0.65 },
  battle_warning: { gainReductionDb: 10, attackSec: 0.1, releaseSec: 0.55 },
  tactical_feedback: { gainReductionDb: 8, attackSec: 0.1, releaseSec: 0.45 },
  character_flavor: { gainReductionDb: 7, attackSec: 0.12, releaseSec: 0.4 },
  enemy_bark: { gainReductionDb: 6, attackSec: 0.12, releaseSec: 0.35 },
}

/** sceneId(见 data/maps MAP_SCENE_IDS) -> 音轨 id */
export const MAP_MUSIC: Record<string, string> = {
  'scene-01-megastructure-h4': 'level_01_megastructure_h4',
  'scene-02-underground-mercenary-bar': 'level_02_underground_mercenary_bar',
  'scene-03-neon-market-braindance-club': 'level_03_neon_market_braindance_club',
  'scene-04-megatower-cloud-club': 'level_04_megatower_cloud_club',
  'scene-05-corporate-hotel-siege': 'level_05_corporate_hotel_siege',
  'scene-06-corporate-plaza-ai-core': 'level_05_corporate_hotel_siege',
}

/** BossId('enforcer'/'eve') -> 音轨 id,通过中间层 bossId 字符串对应 */
export const BOSS_MUSIC: Record<string, string> = {
  enforcer_zero: 'boss_01_enforcer_zero',
  eve_9: 'boss_02_eve_9',
}

/** data/bosses.ts 的 BossId -> bgm-controller 使用的 bossId 字符串,原 music-system.mjs 常量 n */
export const BOSS_ID_TO_MUSIC_KEY: Record<'enforcer' | 'eve', string> = {
  enforcer: 'enforcer_zero',
  eve: 'eve_9',
}

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'level_01_megastructure_h4', name: 'H4:垂直贫民层', file: 'level-01-megastructure-h4.mp3', role: 'level', sceneId: 'scene-01-megastructure-h4' },
  { id: 'level_02_underground_mercenary_bar', name: '地下佣兵酒吧:钢铁后巷', file: 'level-02-underground-mercenary-bar.mp3', role: 'level', sceneId: 'scene-02-underground-mercenary-bar' },
  { id: 'level_03_neon_market_braindance_club', name: '霓虹市场:失真记忆', file: 'level-03-neon-market-braindance-club.mp3', role: 'level', sceneId: 'scene-03-neon-market-braindance-club' },
  { id: 'level_04_megatower_cloud_club', name: 'H8 云端会所:玻璃牢笼', file: 'level-04-megatower-cloud-club.mp3', role: 'level', sceneId: 'scene-04-megatower-cloud-club' },
  { id: 'level_05_corporate_hotel_siege', name: '企业酒店围攻:封锁线', file: 'level-05-corporate-hotel-siege.mp3', role: 'level', sceneId: 'scene-05-corporate-hotel-siege' },
  { id: 'boss_01_enforcer_zero', name: '执法者·零号:焦土协议', file: 'boss-01-enforcer-zero.mp3', role: 'boss', bossId: 'enforcer_zero' },
  { id: 'boss_02_eve_9', name: '夏娃-9:永久静默', file: 'boss-02-eve-9.mp3', role: 'boss', bossId: 'eve_9' },
]

export function allMusicFiles(): Array<{ key: string; path: string }> {
  return MUSIC_TRACKS.map((track) => ({ key: `music-${track.id}`, path: `assets/audio/music/${track.file}` }))
}
