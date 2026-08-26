/**
 * 璇煶鎾姤绯荤粺 鈥斺€?鍘熸牱杩佺Щ鑷?闇撹櫣闃茬嚎/voice-system.js 鐨勮涓鸿涔?
 * 搴曞眰闊抽鎾斁鎹㈡垚 Phaser Sound Manager,浣嗗喎鍗?浼樺厛绾?杞崲閫夊彇閫昏緫淇濇寔涓€鑷淬€? */

import Phaser from 'phaser'
import { VOICE_CATALOG, VOICE_COOLDOWN_MS, VOICE_PLAYBACK_RATE, voiceClassId, type VoiceCategory } from './voiceManifest'
import { EventBus, GameEvents } from '../state/EventBus'

const MUTE_KEY = 'neon-defense-voice-muted'

export interface VoicePlayOptions {
  priority?: number
  chance?: number
  /** 鐢ㄤ簬鏈夌嫭绔嬭妭娴佽鏃剁殑鍏抽敭鎾姤锛屼緥濡傚ぇ鏈惀鍙楀嚮璀︽姤銆?*/
  bypassGlobalCooldown?: boolean
}

export class VoiceSystem {
  private readonly sound: Phaser.Sound.BaseSoundManager
  private readonly roundRobin = new Map<string, number>()
  private current: Phaser.Sound.BaseSound | null = null
  private currentClassId: string | null = null
  private lastPlayedAt = -Infinity
  private _muted = localStorage.getItem(MUTE_KEY) === 'true'
  private unlocked = false

  constructor(sound: Phaser.Sound.BaseSoundManager) {
    this.sound = sound
    const unlock = () => {
      this.unlocked = true
    }
    window.addEventListener('pointerdown', unlock, { capture: true, once: true })
    window.addEventListener('keydown', unlock, { capture: true, once: true })
  }

  get muted() {
    return this._muted
  }

  setMuted(muted: boolean) {
    this._muted = muted
    localStorage.setItem(MUTE_KEY, String(muted))
    if (muted) this.stopCurrent()
  }

  toggle() {
    this.setMuted(!this._muted)
  }

  /** 鎾斁涓€鏉¤闊?鍘?`window.NeonVoice.play`,category:event 鍛戒腑娓呭崟鍒欐寜杞崲椤哄簭鎾斁鍊欓€夋枃浠朵箣涓€ */
  play(category: VoiceCategory, event: string, opts: VoicePlayOptions = {}): boolean {
    if (this._muted || !this.unlocked) return false
    if (opts.chance != null && Math.random() > opts.chance) return false

    // All character voices use one exclusive channel; background music remains independent.
    if (this.current) return false

    const now = performance.now()
    if (!opts.bypassGlobalCooldown && now - this.lastPlayedAt < VOICE_COOLDOWN_MS) return false

    const list = VOICE_CATALOG[category]?.[event] ?? []
    if (!list.length) return false
    const rrKey = `${category}:${event}`
    const cursor = this.roundRobin.get(rrKey) ?? 0
    const file = list[cursor % list.length]
    this.roundRobin.set(rrKey, (cursor + 1) % list.length)

    const index = list.indexOf(file)
    const key = `voice-${category}-${event}-${index}`

    this.lastPlayedAt = now
    this.currentClassId = voiceClassId(category, event)

    const instance = this.sound.add(key, { volume: 0.82, rate: VOICE_PLAYBACK_RATE })
    instance.once('complete', () => this.onCurrentEnded(instance))
    instance.once('stop', () => this.onCurrentEnded(instance))
    this.current = instance
    EventBus.emit(GameEvents.VoiceStart, { classId: this.currentClassId })
    instance.play()
    return true
  }

  /** 离开战场时立即终止正在播放的角色语音。 */
  stop() {
    this.stopCurrent()
  }

  private stopCurrent() {
    const instance = this.current
    const classId = this.currentClassId
    if (!instance) return
    this.current = null
    this.currentClassId = null
    instance.stop()
    instance.destroy()
    if (classId) EventBus.emit(GameEvents.VoiceEnd, { classId })
  }

  private onCurrentEnded(instance: Phaser.Sound.BaseSound) {
    if (this.current !== instance) return
    const classId = this.currentClassId
    this.current = null
    this.currentClassId = null
    instance.destroy()
    if (classId) EventBus.emit(GameEvents.VoiceEnd, { classId })
  }
}

