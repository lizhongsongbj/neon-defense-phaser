import type Phaser from 'phaser'
import { VoiceSystem } from './VoiceSystem'
import { MusicController } from './MusicController'

export * from './VoiceSystem'
export * from './MusicController'
export * from './voiceManifest'
export * from './musicManifest'
export * from './EnemySpawnSfx'

export const VOICE_REGISTRY_KEY = 'voiceSystem'
export const MUSIC_REGISTRY_KEY = 'musicController'

/** 全局唯一的语音/音乐系统实例,挂在 game.registry 上供所有场景共享,原版对应 window.NeonVoice / window.NeonBGM */
export function ensureAudioSystems(game: Phaser.Game): { voice: VoiceSystem; music: MusicController } {
  let voice = game.registry.get(VOICE_REGISTRY_KEY) as VoiceSystem | undefined
  let music = game.registry.get(MUSIC_REGISTRY_KEY) as MusicController | undefined
  if (!voice) {
    voice = new VoiceSystem(game.sound)
    game.registry.set(VOICE_REGISTRY_KEY, voice)
  }
  if (!music) {
    music = new MusicController(game.sound)
    game.registry.set(MUSIC_REGISTRY_KEY, music)
  }
  return { voice, music }
}
