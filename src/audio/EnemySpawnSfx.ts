import { claimBattleSfx } from './SfxCooldown'

export type MechanicalSpawnEnemy = 'gang' | 'riot' | 'ninja'

/**
 * Lightweight synthesized enemy-entry cues. They are deliberately non-verbal:
 * servos, hydraulic impacts and phase electronics remain readable under music.
 */
export class EnemySpawnSfx {
  private context: AudioContext | null = null
  private readonly lastPlayedAt = new Map<MechanicalSpawnEnemy, number>()
  private readonly minimumGapMs: Record<MechanicalSpawnEnemy, number> = {
    gang: 620,
    riot: 1050,
    ninja: 820,
  }

  play(type: string, screenRatio = 0.5) {
    if (type !== 'gang' && type !== 'riot' && type !== 'ninja') return
    const now = performance.now()
    if (now - (this.lastPlayedAt.get(type) ?? -Infinity) < this.minimumGapMs[type]) return
    if (!claimBattleSfx(now)) return

    const context = this.ensureContext()
    if (!context) return
    this.lastPlayedAt.set(type, now)
    if (context.state === 'suspended') void context.resume()

    const pan = Math.max(-0.72, Math.min(0.72, (screenRatio - 0.5) * 1.44))
    if (type === 'gang') this.playGang(context, pan)
    else if (type === 'riot') this.playRiot(context, pan)
    else this.playNinja(context, pan)
  }

  destroy() {
    if (this.context && this.context.state !== 'closed') void this.context.close()
    this.context = null
    this.lastPlayedAt.clear()
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.context.state !== 'closed') return this.context
    const AudioContextCtor = window.AudioContext
    if (!AudioContextCtor) return null
    this.context = new AudioContextCtor()
    return this.context
  }

  private output(context: AudioContext, pan: number, volume: number) {
    const gain = context.createGain()
    gain.gain.value = volume
    const panner = context.createStereoPanner()
    panner.pan.value = pan
    gain.connect(panner).connect(context.destination)
    return gain
  }

  private tone(
    context: AudioContext,
    destination: AudioNode,
    start: number,
    duration: number,
    fromHz: number,
    toHz: number,
    volume: number,
    wave: OscillatorType,
  ) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(fromHz, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, toHz), start + duration)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.018, duration * 0.2))
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain).connect(destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  private noise(context: AudioContext, destination: AudioNode, start: number, duration: number, volume: number, highpassHz: number) {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration))
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < frameCount; index += 1) {
      const envelope = 1 - index / frameCount
      data[index] = (Math.random() * 2 - 1) * envelope
    }
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    filter.type = 'highpass'
    filter.frequency.value = highpassHz
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.buffer = buffer
    source.connect(filter).connect(gain).connect(destination)
    source.start(start)
  }

  private playGang(context: AudioContext, pan: number) {
    const start = context.currentTime + 0.008
    const output = this.output(context, pan, 0.15)
    this.tone(context, output, start, 0.16, 290, 118, 0.72, 'square')
    this.tone(context, output, start + 0.08, 0.09, 940, 520, 0.35, 'triangle')
    this.tone(context, output, start + 0.19, 0.08, 760, 430, 0.28, 'square')
    this.noise(context, output, start + 0.02, 0.19, 0.22, 900)
  }

  private playRiot(context: AudioContext, pan: number) {
    const start = context.currentTime + 0.008
    const output = this.output(context, pan, 0.2)
    this.tone(context, output, start, 0.38, 118, 42, 0.95, 'sawtooth')
    this.tone(context, output, start + 0.16, 0.2, 210, 72, 0.55, 'square')
    this.tone(context, output, start + 0.43, 0.11, 92, 58, 0.6, 'triangle')
    this.noise(context, output, start + 0.08, 0.5, 0.34, 320)
  }

  private playNinja(context: AudioContext, pan: number) {
    const start = context.currentTime + 0.008
    const output = this.output(context, pan, 0.13)
    this.tone(context, output, start, 0.3, 330, 1880, 0.48, 'sine')
    this.tone(context, output, start + 0.19, 0.13, 2100, 680, 0.42, 'triangle')
    this.tone(context, output, start + 0.31, 0.07, 1320, 240, 0.34, 'square')
    this.noise(context, output, start + 0.05, 0.34, 0.18, 2400)
  }
}
