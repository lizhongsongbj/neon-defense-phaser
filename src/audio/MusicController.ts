/**
 * 背景音乐控制器 —— 原样迁移自 霓虹防线/bgm-controller.mjs + music-system.mjs 的行为语义
 * (地图音乐/Boss 音乐切换、进出 Boss 时的淡入淡出与暂停续播、语音闪避)。
 * 底层播放对象换成 Phaser Sound Manager 音轨,淡入淡出沿用原版的 requestAnimationFrame 手动渐变。
 */

import Phaser from 'phaser'
import { MAP_MUSIC, BOSS_MUSIC, MUSIC_BUSES, MUSIC_DUCKING, MUSIC_TRACKS, BOSS_ID_TO_MUSIC_KEY } from './musicManifest'
import { MAP_SCENE_IDS } from '../data/maps'
import type { BossId } from '../data/bosses'
import { EventBus, GameEvents } from '../state/EventBus'

const MUTE_KEY = 'neon-defense-music-muted'

function dbToLinear(db: number): number {
  return Math.min(1, Math.max(0, 10 ** (db / 20)))
}

function fadeVolume(
  sound: Phaser.Sound.BaseSound & { volume: number },
  target: number,
  durationSec: number,
  pauseAtEnd = false,
): Promise<void> {
  return new Promise((resolve) => {
    const from = sound.volume
    const durationMs = Math.max(0, durationSec * 1000)
    if (durationMs === 0) {
      sound.volume = target
      if (pauseAtEnd) sound.pause()
      resolve()
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / durationMs))
      sound.volume = from + (target - from) * t
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        if (pauseAtEnd) sound.pause()
        resolve()
      }
    }
    requestAnimationFrame(step)
  })
}

export class MusicController {
  private readonly sound: Phaser.Sound.BaseSoundManager
  private mapSound: (Phaser.Sound.BaseSound & { volume: number }) | null = null
  private mapTrackId: string | null = null
  private bossSound: (Phaser.Sound.BaseSound & { volume: number }) | null = null
  private bossTrackId: string | null = null
  private voiceClassId: string | null = null
  private started = false
  private mapIndex = 0
  private _muted = localStorage.getItem(MUTE_KEY) === 'true'

  constructor(sound: Phaser.Sound.BaseSoundManager) {
    this.sound = sound
    EventBus.on(GameEvents.VoiceStart, (p: { classId: string }) => this.setVoiceActive(p.classId, true))
    EventBus.on(GameEvents.VoiceEnd, (p: { classId: string }) => this.setVoiceActive(p.classId, false))
  }

  get muted() {
    return this._muted
  }

  get activeRole(): 'map' | 'boss' | null {
    if (this.bossSound) return 'boss'
    if (this.mapSound) return 'map'
    return null
  }

  private hasTrack(key: string): boolean {
    return this.sound.game.cache.audio.exists(key)
  }

  private roleGain(role: 'map' | 'boss'): number {
    const bus = MUSIC_BUSES[role]
    const ducking = this.voiceClassId ? MUSIC_DUCKING[this.voiceClassId] : null
    return dbToLinear(bus.gainDb - (ducking?.gainReductionDb ?? 0))
  }

  /** 战役开局启动地图 BGM,原 `window.NeonBGM.start` */
  start(mapIndex = this.mapIndex) {
    this.started = true
    this.mapIndex = Math.max(0, Math.min(MAP_SCENE_IDS.length - 1, mapIndex))
    void this.enterMap(MAP_SCENE_IDS[this.mapIndex])
  }

  /** 切换地图但不影响 started 状态,原 `playMap` */
  async playMap(mapIndex: number) {
    this.mapIndex = Math.max(0, Math.min(MAP_SCENE_IDS.length - 1, mapIndex))
    if (!this.started) return
    await this.exitBoss({ resumeMap: false })
    await this.enterMap(MAP_SCENE_IDS[this.mapIndex])
  }

  private async enterMap(sceneId: string) {
    const trackId = MAP_MUSIC[sceneId]
    if (!trackId) return
    const track = MUSIC_TRACKS.find((t) => t.id === trackId)
    if (!track) return
    const key = `music-${track.id}`
    if (!this.hasTrack(key)) return

    if (this.mapTrackId !== track.id) {
      this.mapSound?.stop()
      this.mapSound?.destroy()
      this.mapTrackId = track.id
      const instance = this.sound.add(key, { loop: true, volume: 0 }) as Phaser.Sound.BaseSound & { volume: number }
      this.mapSound = instance
      if (!this.bossSound && !this._muted) {
        instance.play()
        await fadeVolume(instance, this.roleGain('map'), MUSIC_BUSES.map.fadeInSec)
      }
    } else if (!this.bossSound && !this._muted && this.mapSound && !this.mapSound.isPlaying) {
      this.mapSound.play()
    }
  }

  /** 进入 Boss 战 BGM,原 `enterBoss` */
  async enterBoss(bossId: BossId) {
    if (!this.started) return
    const musicKey = BOSS_ID_TO_MUSIC_KEY[bossId]
    const trackId = BOSS_MUSIC[musicKey]
    if (!trackId) return
    if (this.bossTrackId === trackId && this.bossSound) return
    if (this.bossSound) await this.exitBoss({ resumeMap: false })

    const track = MUSIC_TRACKS.find((t) => t.id === trackId)
    if (!track) return
    const key = `music-${track.id}`
    if (!this.hasTrack(key)) return

    this.bossTrackId = track.id
    const instance = this.sound.add(key, { loop: true, volume: 0 }) as Phaser.Sound.BaseSound & { volume: number }
    this.bossSound = instance
    if (this._muted) {
      this.mapSound?.pause()
      return
    }
    instance.play()
    const tasks = [fadeVolume(instance, this.roleGain('boss'), MUSIC_BUSES.boss.enterSec)]
    if (this.mapSound?.isPlaying) {
      tasks.push(fadeVolume(this.mapSound, 0, MUSIC_BUSES.boss.enterSec, true))
    }
    await Promise.all(tasks)
  }

  /** 退出 Boss 战,续播地图 BGM,原 `exitBoss` */
  async exitBoss({ resumeMap = true }: { resumeMap?: boolean } = {}) {
    if (!this.bossSound) return
    const boss = this.bossSound
    this.bossSound = null
    this.bossTrackId = null
    await fadeVolume(boss, 0, MUSIC_BUSES.boss.exitSec, true)
    boss.destroy()
    if (resumeMap && this.mapSound && !this._muted) {
      this.mapSound.volume = 0
      this.mapSound.play()
      await fadeVolume(this.mapSound, this.roleGain('map'), MUSIC_BUSES.map.fadeInSec)
    }
  }

  private async setVoiceActive(classId: string, active: boolean) {
    this.voiceClassId = active ? classId : null
    const ducking = MUSIC_DUCKING[classId]
    const activeSound = this.bossSound ?? this.mapSound
    if (!activeSound || !ducking) return
    const role: 'map' | 'boss' = this.bossSound ? 'boss' : 'map'
    await fadeVolume(activeSound, this.roleGain(role), active ? ducking.attackSec : ducking.releaseSec)
  }

  async setMuted(muted: boolean) {
    this._muted = muted
    localStorage.setItem(MUTE_KEY, String(muted))
    const activeSound = this.bossSound ?? this.mapSound
    if (!activeSound) return
    if (muted) {
      activeSound.pause()
      activeSound.volume = 0
      return
    }
    activeSound.play()
    await fadeVolume(activeSound, this.roleGain(this.bossSound ? 'boss' : 'map'), 0.25)
  }

  toggle() {
    void this.setMuted(!this._muted)
  }
}
