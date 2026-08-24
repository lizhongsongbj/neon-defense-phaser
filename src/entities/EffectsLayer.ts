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
 * 塔楼本体只为磁轨、电弧和黑客攻击提供发射点；佣兵与无人机由各自单位演员负责出动。
 */
export class EffectsLayer {
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  playShot(from: { x: number; y: number }, to: { x: number; y: number }, effect: string) {
    const color = EFFECT_COLORS[effect] ?? 0xffffff

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
