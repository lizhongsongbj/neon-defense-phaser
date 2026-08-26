import Phaser from 'phaser'
import { MAP_MUSIC, BOSS_MUSIC, MUSIC_BUSES, MUSIC_DUCKING, MUSIC_TRACKS, BOSS_ID_TO_MUSIC_KEY } from './musicManifest'
import { MAP_SCENE_IDS } from '../data/maps'
import type { BossId } from '../data/bosses'
import { EventBus, GameEvents } from '../state/EventBus'

const MUTE_KEY = 'neon-defense-music-muted'

type MusicSound = Phaser.Sound.BaseSound & { volume: number }

function dbToLinear(db: number): number {
  return Math.min(1, Math.max(0, 10 ** (db / 20)))
}

function fadeVolume(
  sound: MusicSound,
  target: number,
  durationSec: number,
  pauseAtEnd = false,
  shouldCancel?: () => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const from = sound.volume
    const durationMs = Math.max(0, durationSec * 1000)
    if (durationMs === 0) {
      if (!shouldCancel?.()) {
        sound.volume = target
        if (pauseAtEnd) sound.pause()
      }
      resolve()
      return
    }

    const start = performance.now()
    const step = (now: number) => {
      if (shouldCancel?.()) {
        resolve()
        return
      }
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
  private mapSound: MusicSound | null = null
  private mapTrackId: string | null = null
  private bossSound: MusicSound | null = null
  private bossTrackId: string | null = null
  private readonly fadeVersions = new WeakMap<MusicSound, number>()
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

  /** 每条音轨只允许最后一次淡入/淡出继续写入音量。 */
  private async fadeSound(sound: MusicSound, target: number, durationSec: number, pauseAtEnd = false) {
    const version = (this.fadeVersions.get(sound) ?? 0) + 1
    this.fadeVersions.set(sound, version)
    await fadeVolume(sound, target, durationSec, pauseAtEnd, () => {
      const superseded = this.fadeVersions.get(sound) !== version
      const mutedDuringFadeIn = target > 0 && this._muted
      return superseded || mutedDuringFadeIn
    })
  }

  private stopFade(sound: MusicSound) {
    this.fadeVersions.set(sound, (this.fadeVersions.get(sound) ?? 0) + 1)
  }

  private pauseAndSilence(sound: MusicSound | null) {
    if (!sound) return
    this.stopFade(sound)
    sound.volume = 0
    if (sound.isPlaying) sound.pause()
  }

  private resume(sound: MusicSound) {
    if (sound.isPaused) sound.resume()
    else if (!sound.isPlaying) sound.play()
  }

  /** 主界面只播放基础背景音乐，不跟随当前选中的地图切换。 */
  startMenu() {
    this.started = true
    this.mapIndex = 0
    void this.exitBoss({ resumeMap: false }).then(() => this.enterMap(MAP_SCENE_IDS[0]))
  }

  /** 战役开局启动地图背景音乐。 */
  start(mapIndex = this.mapIndex) {
    this.started = true
    this.mapIndex = Math.max(0, Math.min(MAP_SCENE_IDS.length - 1, mapIndex))
    void this.enterMap(MAP_SCENE_IDS[this.mapIndex])
  }

  /** 切换地图但不影响 started 状态。 */
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
      if (this.mapSound) this.stopFade(this.mapSound)
      this.mapSound?.stop()
      this.mapSound?.destroy()
      this.mapTrackId = track.id
      const instance = this.sound.add(key, { loop: true, volume: 0 }) as MusicSound
      this.mapSound = instance
      if (!this.bossSound && !this._muted) {
        instance.play()
        await this.fadeSound(instance, this.roleGain('map'), MUSIC_BUSES.map.fadeInSec)
      }
    } else if (!this.bossSound && !this._muted && this.mapSound && !this.mapSound.isPlaying) {
      this.resume(this.mapSound)
      await this.fadeSound(this.mapSound, this.roleGain('map'), MUSIC_BUSES.map.fadeInSec)
    }
  }

  /** 进入 Boss 战背景音乐。 */
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
    const instance = this.sound.add(key, { loop: true, volume: 0 }) as MusicSound
    this.bossSound = instance
    if (this._muted) {
      this.pauseAndSilence(this.mapSound)
      this.pauseAndSilence(instance)
      return
    }

    instance.play()
    const tasks = [this.fadeSound(instance, this.roleGain('boss'), MUSIC_BUSES.boss.enterSec)]
    if (this.mapSound?.isPlaying) {
      tasks.push(this.fadeSound(this.mapSound, 0, MUSIC_BUSES.boss.enterSec, true))
    }
    await Promise.all(tasks)
  }

  /** 退出 Boss 战，续播地图背景音乐。 */
  async exitBoss({ resumeMap = true }: { resumeMap?: boolean } = {}) {
    if (!this.bossSound) return
    const boss = this.bossSound
    this.bossSound = null
    this.bossTrackId = null
    await this.fadeSound(boss, 0, MUSIC_BUSES.boss.exitSec, true)
    boss.destroy()
    if (resumeMap && this.mapSound && !this._muted) {
      this.mapSound.volume = 0
      this.resume(this.mapSound)
      await this.fadeSound(this.mapSound, this.roleGain('map'), MUSIC_BUSES.map.fadeInSec)
    }
  }

  private async setVoiceActive(classId: string, active: boolean) {
    this.voiceClassId = active ? classId : null
    const ducking = MUSIC_DUCKING[classId]
    const activeSound = this.bossSound ?? this.mapSound
    if (!activeSound || !ducking || this._muted) return
    const role: 'map' | 'boss' = this.bossSound ? 'boss' : 'map'
    await this.fadeSound(activeSound, this.roleGain(role), active ? ducking.attackSec : ducking.releaseSec)
  }

  async setMuted(muted: boolean) {
    this._muted = muted
    localStorage.setItem(MUTE_KEY, String(muted))
    if (muted) {
      // Boss 切歌时两条轨道可能短暂共存，必须全部停止。
      this.pauseAndSilence(this.mapSound)
      this.pauseAndSilence(this.bossSound)
      return
    }

    const activeSound = this.bossSound ?? this.mapSound
    if (!activeSound) return

    // 只恢复当前角色的音乐，避免地图音乐和 Boss 音乐同时播放。
    const inactiveSound = this.bossSound ? this.mapSound : null
    this.pauseAndSilence(inactiveSound)
    activeSound.volume = 0
    this.resume(activeSound)
    await this.fadeSound(activeSound, this.roleGain(this.bossSound ? 'boss' : 'map'), 0.25)
  }

  toggle() {
    void this.setMuted(!this._muted)
  }
}
