export type SpecialCombatEnemy = 'faraday' | 'hijacker' | 'neurohound' | 'matriarch' | 'bonebreaker' | 'enforcer' | 'eve'

const SPECIAL_COMBAT_ENEMIES = new Set<SpecialCombatEnemy>([
  'faraday',
  'hijacker',
  'neurohound',
  'matriarch',
  'bonebreaker',
  'enforcer',
  'eve',
])

export function isSpecialCombatEnemy(type: string): type is SpecialCombatEnemy {
  return SPECIAL_COMBAT_ENEMIES.has(type as SpecialCombatEnemy)
}

/**
 * Procedural, non-verbal combat cues for special enemies and bosses.
 * Keeping these cues synthesized makes them responsive to stereo position and
 * avoids competing with character voices in the shared voice channel.
 */
export class EnemyCombatSfx {
  private context: AudioContext | null = null
  private readonly lastAttackAt = new Map<SpecialCombatEnemy, number>()
  private readonly lastDeathAt = new Map<SpecialCombatEnemy, number>()
  private readonly attackGapMs: Record<SpecialCombatEnemy, number> = {
    faraday: 1050,
    hijacker: 1350,
    neurohound: 780,
    matriarch: 1450,
    bonebreaker: 1250,
    enforcer: 1100,
    eve: 1200,
  }

  playAttack(type: string, screenRatio = 0.5) {
    if (!isSpecialCombatEnemy(type)) return
    const now = performance.now()
    if (now - (this.lastAttackAt.get(type) ?? -Infinity) < this.attackGapMs[type]) return
    const context = this.ensureContext()
    if (!context) return
    this.lastAttackAt.set(type, now)
    if (context.state === 'suspended') void context.resume()
    this.render(type, 'attack', context, this.pan(screenRatio))
  }

  playDeath(type: string, screenRatio = 0.5) {
    if (!isSpecialCombatEnemy(type)) return
    const now = performance.now()
    if (now - (this.lastDeathAt.get(type) ?? -Infinity) < 260) return
    const context = this.ensureContext()
    if (!context) return
    this.lastDeathAt.set(type, now)
    if (context.state === 'suspended') void context.resume()
    this.render(type, 'death', context, this.pan(screenRatio))
  }

  destroy() {
    if (this.context && this.context.state !== 'closed') void this.context.close()
    this.context = null
    this.lastAttackAt.clear()
    this.lastDeathAt.clear()
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.context.state !== 'closed') return this.context
    const AudioContextCtor = window.AudioContext
    if (!AudioContextCtor) return null
    this.context = new AudioContextCtor()
    return this.context
  }

  private pan(screenRatio: number) {
    return Math.max(-0.78, Math.min(0.78, (screenRatio - 0.5) * 1.56))
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
    oscillator.frequency.setValueAtTime(Math.max(20, fromHz), start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, toHz), start + duration)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.018, duration * 0.2))
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain).connect(destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  }

  private noise(
    context: AudioContext,
    destination: AudioNode,
    start: number,
    duration: number,
    volume: number,
    filterType: BiquadFilterType,
    frequency: number,
  ) {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration))
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < frameCount; index += 1) {
      const progress = index / frameCount
      data[index] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 1.35)
    }
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    filter.type = filterType
    filter.frequency.value = frequency
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.buffer = buffer
    source.connect(filter).connect(gain).connect(destination)
    source.start(start)
  }

  private render(type: SpecialCombatEnemy, event: 'attack' | 'death', context: AudioContext, pan: number) {
    const start = context.currentTime + 0.008
    const output = this.output(context, pan, event === 'death' ? 0.19 : 0.14)
    const profile = `${type}:${event}`

    if (profile === 'faraday:attack') {
      this.tone(context, output, start, 0.28, 150, 48, 0.75, 'sawtooth')
      this.tone(context, output, start + 0.06, 0.19, 1850, 520, 0.48, 'square')
      this.noise(context, output, start + 0.03, 0.22, 0.32, 'highpass', 1250)
    } else if (profile === 'faraday:death') {
      this.tone(context, output, start, 0.72, 980, 42, 0.72, 'sawtooth')
      this.noise(context, output, start + 0.12, 0.62, 0.48, 'bandpass', 720)
    } else if (profile === 'hijacker:attack') {
      this.tone(context, output, start, 0.22, 720, 1320, 0.46, 'triangle')
      this.tone(context, output, start + 0.11, 0.18, 190, 72, 0.58, 'square')
      this.noise(context, output, start + 0.08, 0.18, 0.24, 'highpass', 2100)
    } else if (profile === 'hijacker:death') {
      this.tone(context, output, start, 0.9, 760, 58, 0.7, 'triangle')
      this.noise(context, output, start + 0.18, 0.7, 0.5, 'highpass', 850)
    } else if (profile === 'neurohound:attack') {
      this.tone(context, output, start, 0.24, 170, 58, 0.75, 'sawtooth')
      this.noise(context, output, start, 0.2, 0.45, 'lowpass', 620)
      this.tone(context, output, start + 0.16, 0.08, 620, 190, 0.42, 'square')
    } else if (profile === 'neurohound:death') {
      this.tone(context, output, start, 0.72, 330, 38, 0.68, 'sawtooth')
      this.noise(context, output, start + 0.05, 0.58, 0.38, 'lowpass', 480)
    } else if (profile === 'matriarch:attack') {
      this.tone(context, output, start, 0.36, 112, 44, 0.76, 'sine')
      this.noise(context, output, start + 0.04, 0.34, 0.48, 'lowpass', 330)
      this.tone(context, output, start + 0.19, 0.18, 510, 150, 0.28, 'triangle')
    } else if (profile === 'matriarch:death') {
      this.noise(context, output, start, 0.9, 0.56, 'lowpass', 290)
      this.tone(context, output, start + 0.04, 0.82, 210, 32, 0.72, 'sine')
    } else if (profile === 'bonebreaker:attack') {
      this.tone(context, output, start, 0.3, 92, 34, 0.95, 'square')
      this.noise(context, output, start, 0.3, 0.52, 'bandpass', 520)
      this.tone(context, output, start + 0.2, 0.12, 170, 62, 0.48, 'sawtooth')
    } else if (profile === 'bonebreaker:death') {
      this.tone(context, output, start, 0.82, 130, 28, 0.9, 'square')
      this.noise(context, output, start + 0.08, 0.9, 0.62, 'bandpass', 460)
    } else if (profile === 'enforcer:attack') {
      this.tone(context, output, start, 0.26, 210, 46, 0.9, 'sawtooth')
      this.noise(context, output, start + 0.03, 0.38, 0.58, 'highpass', 540)
      this.tone(context, output, start + 0.16, 0.2, 1100, 260, 0.38, 'square')
    } else if (profile === 'enforcer:death') {
      this.tone(context, output, start, 1.25, 180, 24, 0.95, 'sawtooth')
      this.noise(context, output, start, 1.15, 0.68, 'bandpass', 410)
      this.tone(context, output, start + 0.28, 0.72, 860, 55, 0.5, 'square')
    } else if (profile === 'eve:attack') {
      this.tone(context, output, start, 0.42, 1480, 74, 0.64, 'sine')
      this.tone(context, output, start + 0.04, 0.32, 740, 92, 0.46, 'square')
      this.noise(context, output, start + 0.18, 0.2, 0.28, 'highpass', 1800)
    } else if (profile === 'eve:death') {
      this.tone(context, output, start, 1.35, 1900, 28, 0.78, 'sine')
      this.tone(context, output, start + 0.2, 1.05, 630, 35, 0.62, 'sawtooth')
      this.noise(context, output, start + 0.36, 0.92, 0.5, 'highpass', 720)
    }
  }
}
