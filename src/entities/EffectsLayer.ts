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
  private readonly remnants: Phaser.GameObjects.Image[] = []

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

  /** 使用用户圈选的一级黑客中继脉冲序列；16帧保持原动画的生成、显现和消散节奏。 */
  playHackerPulse(from: { x: number; y: number }, to: { x: number; y: number }, level: number) {
    const animationKey = 'fx-hacker-selected-pulse-fire'
    if (!this.scene.anims.exists(animationKey)) {
      this.scene.anims.create({
        key: animationKey,
        frames: Array.from({ length: 16 }, (_, index) => ({
          key: `fx-hacker-selected-pulse-${String(index + 1).padStart(2, '0')}`,
        })),
        duration: 16 * 55,
        repeat: 0,
      })
    }

    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const displayWidth = Phaser.Math.Clamp(distance, 72, 260)
    const displayHeight = Phaser.Math.Clamp(displayWidth * (101 / 247), 28, 74)
    const rotation = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y) - Math.PI
    const pulse = this.scene.add.sprite(from.x, from.y, 'fx-hacker-selected-pulse-01')
      .setOrigin(1, 0.5)
      .setDisplaySize(displayWidth, displayHeight)
      .setRotation(rotation)
      .setAlpha(Phaser.Math.Clamp(0.88 + level * 0.03, 0.88, 1))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(86)

    pulse.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => pulse.destroy())
    pulse.play(animationKey)
    this.scene.time.delayedCall(11 * 55, () => this.playImpact(to, 'hacker'))
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

  playMercenaryDeath(at: { x: number; y: number }) {
    for (let i = 0; i < 9; i += 1) {
      const angle = Phaser.Math.FloatBetween(Math.PI * 0.05, Math.PI * 0.95)
      const distance = Phaser.Math.Between(9, 30)
      const droplet = this.scene.add.circle(at.x, at.y, Phaser.Math.Between(1, 3), i % 5 === 0 ? 0x29c5d2 : 0x7f0717, 0.9).setDepth(88)
      this.scene.tweens.add({
        targets: droplet,
        x: at.x + Math.cos(angle) * distance,
        y: at.y - Math.sin(angle) * distance + Phaser.Math.Between(10, 22),
        scale: 0.35,
        alpha: 0,
        duration: Phaser.Math.Between(360, 620),
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      })
    }
    // 血滴仍在空中时血迹开始淡入，避免佣兵、血滴和残留之间出现生硬切换。
    this.scene.time.delayedCall(260, () => this.playDeathRemnant(at, false, false, 380))
  }

  /** 三段无缝坠毁：下坠由 DroneSquadActor 完成；撞地同帧出现火苗；火苗结束同帧换为残骸。 */
  playDroneCrash(at: { x: number; y: number }) {
    if (!this.scene.textures.exists('drone-crash-flame')) {
      this.playDeathRemnant(at, true)
      return
    }
    const flame = this.scene.add.image(at.x, at.y - 8, 'drone-crash-flame')
      .setDisplaySize(42, 58)
      .setOrigin(0.5, 0.82)
      .setDepth(90)
      .setAlpha(0.96)
    this.scene.tweens.add({
      targets: flame,
      scaleX: { from: 0.82, to: 1.08 },
      scaleY: { from: 0.9, to: 1.15 },
      angle: { from: -3, to: 3 },
      duration: 135,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    })
    // 火苗尚未完全熄灭时，残骸提前淡入约数帧，使两者自然交叠。
    this.scene.time.delayedCall(650, () => {
      this.playDeathRemnant(at, true, false, 460)
      if (!flame.active) return
      this.scene.tweens.killTweensOf(flame)
      this.scene.tweens.add({
        targets: flame,
        alpha: 0,
        scaleX: 0.88,
        scaleY: 0.78,
        duration: 560,
        ease: 'Sine.easeInOut',
        onComplete: () => flame.destroy(),
      })
    })
  }

  playDeathRemnant(at: { x: number; y: number }, mechanical: boolean, large = false, revealDuration = 0) {
    const key = mechanical ? 'remnant-mechanical' : 'remnant-biological'
    if (!this.scene.textures.exists(key)) return
    const remnant = this.scene.add.image(at.x, at.y + 7, key)
      .setDisplaySize(large ? 92 : mechanical ? 62 : 55, large ? 70 : mechanical ? 48 : 38)
      .setRotation(Phaser.Math.FloatBetween(-0.35, 0.35))
      .setAlpha(revealDuration > 0 ? 0 : mechanical ? 0.92 : 0.82)
      .setDepth(4)
    this.remnants.push(remnant)
    while (this.remnants.length > 28) this.remnants.shift()?.destroy()
    const fadeRemnant = () => this.scene.tweens.add({
      targets: remnant,
      alpha: mechanical ? 0.42 : 0.28,
      duration: 9000,
      hold: 3500,
      onComplete: () => {
        const index = this.remnants.indexOf(remnant)
        if (index >= 0) this.remnants.splice(index, 1)
        remnant.destroy()
      },
    })
    if (revealDuration > 0) {
      this.scene.tweens.add({
        targets: remnant,
        alpha: mechanical ? 0.92 : 0.82,
        duration: revealDuration,
        ease: 'Sine.easeOut',
        onComplete: fadeRemnant,
      })
    } else {
      fadeRemnant()
    }
  }

  playFlash(from: { x: number; y: number }, to: { x: number; y: number }, color: number) {
    const line = this.scene.add.line(0, 0, from.x, from.y, to.x, to.y, color, 0.8).setLineWidth(2)
    line.setOrigin(0, 0)
    this.scene.tweens.add({ targets: line, alpha: 0, duration: 140, onComplete: () => line.destroy() })
  }
}
