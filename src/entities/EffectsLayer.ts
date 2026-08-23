import Phaser from 'phaser'

const EFFECT_COLORS: Record<string, number> = {
  rail: 0x34c9ff,
  arc: 0x20f4e6,
  mercenary: 0xc99245,
  hacker: 0x79ff9e,
  drone: 0xe8ffff,
}

/**
 * 攻击特效层 —— 原版对应 `.combat-projectile` / `.combat-impact` / `.combat-flash` 元素,
 * 这里用 Phaser Graphics + Tween 简化重现:一条飞行的短线 + 命中处的扩散圆环。
 */
export class EffectsLayer {
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  playShot(from: { x: number; y: number }, to: { x: number; y: number }, effect: string) {
    const color = EFFECT_COLORS[effect] ?? 0xffffff
    if (effect === 'drone' && this.scene.textures.exists('unit-drone-hive')) {
      const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)
      const drone = this.scene.add
        .image(from.x, from.y, 'unit-drone-hive')
        .setDisplaySize(42, 42)
        .setRotation(angle + Math.PI / 2)
        .setDepth(90)
      this.scene.tweens.add({
        targets: drone,
        x: to.x,
        y: to.y,
        duration: 260,
        ease: 'Sine.easeIn',
        onComplete: () => {
          drone.destroy()
          this.playImpact(to, effect)
        },
      })
      return
    }
    const line = this.scene.add.line(0, 0, from.x, from.y, to.x, to.y, color, 0.9).setLineWidth(2)
    line.setOrigin(0, 0)
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 180,
      onComplete: () => line.destroy(),
    })
    this.playImpact(to, effect)
  }

  playImpact(at: { x: number; y: number }, effect: string) {
    const color = EFFECT_COLORS[effect] ?? 0xffffff
    const ring = this.scene.add.circle(at.x, at.y, 4, color, 0.7)
    this.scene.tweens.add({
      targets: ring,
      radius: 14,
      alpha: 0,
      duration: 220,
      onComplete: () => ring.destroy(),
    })
  }

  playFlash(from: { x: number; y: number }, to: { x: number; y: number }, color: number) {
    const line = this.scene.add.line(0, 0, from.x, from.y, to.x, to.y, color, 0.8).setLineWidth(2)
    line.setOrigin(0, 0)
    this.scene.tweens.add({ targets: line, alpha: 0, duration: 140, onComplete: () => line.destroy() })
  }
}
