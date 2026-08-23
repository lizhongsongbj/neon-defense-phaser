/**
 * 语音播报系统 —— 原样迁移自 霓虹防线/voice-system.js 的行为语义,
 * 底层音频播放换成 Phaser Sound Manager,但冷却/优先级/轮换选取逻辑保持一致。
 */

import Phaser from 'phaser'
import { VOICE_CATALOG, VOICE_COOLDOWN_MS, voiceClassId, type VoiceCategory } from './voiceManifest'
import { EventBus, GameEvents } from '../state/EventBus'

const MUTE_KEY = 'neon-defense-voice-muted'

export interface VoicePlayOptions {
  priority?: number
  chance?: number
}

export class VoiceSystem {
  private readonly sound: Phaser.Sound.BaseSoundManager
  private readonly roundRobin = new Map<string, number>()
  private current: Phaser.Sound.BaseSound | null = null
  private currentClassId: string | null = null
  private currentPriority = 0
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

  /** 播放一条语音,原 `window.NeonVoice.play`,category:event 命中清单则按轮换顺序播放候选文件之一 */
  play(category: VoiceCategory, event: string, opts: VoicePlayOptions = {}): boolean {
    const priority = opts.priority ?? 1
    if (this._muted || !this.unlocked) return false
    if (opts.chance != null && Math.random() > opts.chance) return false

    const now = performance.now()
    if (now - this.lastPlayedAt < VOICE_COOLDOWN_MS) return false

    const list = VOICE_CATALOG[category]?.[event] ?? []
    if (!list.length) return false
    const rrKey = `${category}:${event}`
    const cursor = this.roundRobin.get(rrKey) ?? 0
    const file = list[cursor % list.length]
    this.roundRobin.set(rrKey, (cursor + 1) % list.length)

    const index = list.indexOf(file)
    const key = `voice-${category}-${event}-${index}`

    if (this.current && !this.currentEnded() && priority < this.currentPriority) return false

    this.stopCurrent()
    this.lastPlayedAt = now
    this.currentPriority = priority
    this.currentClassId = voiceClassId(category, event)

    const instance = this.sound.add(key, { volume: 0.82 })
    instance.once('complete', () => this.onCurrentEnded())
    instance.once('stop', () => this.onCurrentEnded())
    this.current = instance
    EventBus.emit(GameEvents.VoiceStart, { classId: this.currentClassId })
    instance.play()
    return true
  }

  private currentEnded(): boolean {
    return !this.current || !this.current.isPlaying
  }

  private stopCurrent() {
    if (this.current) {
      this.current.stop()
      this.current.destroy()
    }
    this.current = null
  }

  private onCurrentEnded() {
    if (this.currentClassId) {
      EventBus.emit(GameEvents.VoiceEnd, { classId: this.currentClassId })
    }
    this.currentClassId = null
    this.current = null
  }
}
