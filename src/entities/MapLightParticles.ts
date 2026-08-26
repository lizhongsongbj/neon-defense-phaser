import Phaser from 'phaser'

type LightPoint = {
  x: number
  y: number
  weight: number
  cumulative: number
  color: number
}

type AmbientParticle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: number
  phase: number
}

/**
 * 从当前关卡地图纹理中提取高亮/高饱和区域，并仅在这些区域生成轻量霓虹粒子。
 * 八张地图共用同一套采样逻辑，无需为每张图手工维护坐标。
 */
export class MapLightParticles {
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly points: LightPoint[] = []
  private readonly particles: AmbientParticle[] = []
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  private totalWeight = 0
  private spawnCarry = 0

  constructor(
    private readonly scene: Phaser.Scene,
    textureKey: string,
    private readonly width: number,
    private readonly height: number,
  ) {
    this.graphics = scene.add.graphics().setDepth(-10).setBlendMode(Phaser.BlendModes.ADD)
    this.sampleBrightPoints(textureKey)
  }

  update(deltaMs: number) {
    const delta = Math.min(50, Math.max(0, deltaMs)) / 1000
    if (!this.reducedMotion && this.points.length) {
      this.spawnCarry += delta * 24
      while (this.spawnCarry >= 1 && this.particles.length < 125) {
        this.spawnParticle()
        this.spawnCarry -= 1
      }
    }

    this.graphics.clear()
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index]
      particle.life -= delta
      if (particle.life <= 0 || particle.y < -18) {
        this.particles.splice(index, 1)
        continue
      }

      particle.phase += delta * 2.5
      particle.x += (particle.vx + Math.sin(particle.phase) * 3.5) * delta
      particle.y += particle.vy * delta

      const progress = 1 - particle.life / particle.maxLife
      const alpha = Math.sin(Math.PI * progress) * .72
      const tail = Math.max(5, Math.abs(particle.vy) * .13)
      this.graphics.lineStyle(Math.max(.7, particle.size * .42), particle.color, alpha * .34)
      this.graphics.lineBetween(particle.x, particle.y + tail, particle.x - particle.vx * .05, particle.y)
      this.graphics.fillStyle(particle.color, alpha * .14)
      this.graphics.fillCircle(particle.x, particle.y, particle.size * 3.1)
      this.graphics.fillStyle(particle.color, alpha)
      this.graphics.fillCircle(particle.x, particle.y, particle.size)
    }
  }

  destroy() {
    this.particles.length = 0
    this.points.length = 0
    this.graphics.destroy()
  }

  private sampleBrightPoints(textureKey: string) {
    if (!this.scene.textures.exists(textureKey)) return
    const source = this.scene.textures.get(textureKey).getSourceImage() as CanvasImageSource | undefined
    if (!source) return

    try {
      const sample = document.createElement('canvas')
      sample.width = 160
      sample.height = 100
      const context = sample.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.drawImage(source, 0, 0, sample.width, sample.height)
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data

      for (let y = 2; y < sample.height - 2; y += 2) {
        for (let x = 2; x < sample.width - 2; x += 2) {
          const offset = (y * sample.width + x) * 4
          const red = pixels[offset]
          const green = pixels[offset + 1]
          const blue = pixels[offset + 2]
          const luminance = red * .2126 + green * .7152 + blue * .0722
          const chroma = Math.max(red, green, blue) - Math.min(red, green, blue)
          const weight = Math.max(0, luminance - 112) + Math.max(0, chroma - 42) * .58
          if (weight <= 16) continue

          this.totalWeight += weight
          const boost = Math.max(1, 208 / Math.max(red, green, blue, 1))
          const color = Phaser.Display.Color.GetColor(
            Math.min(255, Math.round(red * boost)),
            Math.min(255, Math.round(green * boost)),
            Math.min(255, Math.round(blue * boost)),
          )
          this.points.push({
            x: (x / sample.width) * this.width,
            y: (y / sample.height) * this.height,
            weight,
            cumulative: this.totalWeight,
            color,
          })
        }
      }
    } catch (error) {
      console.warn('Unable to sample map highlights for ambient particles.', error)
    }
  }

  private spawnParticle() {
    const point = this.pickPoint()
    if (!point) return
    const maxLife = 1.8 + Math.random() * 2.8
    this.particles.push({
      x: point.x + (Math.random() - .5) * 24,
      y: point.y + (Math.random() - .5) * 15,
      vx: (Math.random() - .5) * 10,
      vy: -(18 + Math.random() * 28),
      life: maxLife,
      maxLife,
      size: .75 + Math.random() * 1.65,
      color: point.color,
      phase: Math.random() * Math.PI * 2,
    })
  }

  private pickPoint() {
    if (!this.points.length || this.totalWeight <= 0) return undefined
    const target = Math.random() * this.totalWeight
    let low = 0
    let high = this.points.length - 1
    while (low < high) {
      const middle = (low + high) >> 1
      if (this.points[middle].cumulative < target) low = middle + 1
      else high = middle
    }
    return this.points[low]
  }
}
