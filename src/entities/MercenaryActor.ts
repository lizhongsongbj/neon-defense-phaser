import Phaser from 'phaser'

/** 集结点上的佣兵小队；所有攻击视觉均从佣兵本体发出。 */
export class MercenaryActor extends Phaser.GameObjects.Container {
  private readonly units: Phaser.GameObjects.Image[]
  private readonly homeX: number[]
  private readonly wasDown: boolean[]

  constructor(scene: Phaser.Scene, count: number) {
    super(scene, 0, 0)
    this.units = []
    this.homeX = []
    this.wasDown = []
    for (let i = 0; i < count; i += 1) {
      const key = i === 0 ? 'unit-mercenary-shield' : 'unit-mercenary-rifle'
      const x = (i - (count - 1) / 2) * 16
      const img = scene.add.image(x, 0, scene.textures.exists(key) ? key : '__MISSING')
      img.setDisplaySize(20, 26)
      this.homeX.push(x)
      this.wasDown.push(false)
      this.units.push(img)
      this.add(img)
    }
    this.setDepth(86)
    scene.add.existing(this)
  }

  /** ?????????????????????????????? */
  deployFrom(source: { x: number; y: number }, destination: { x: number; y: number }) {
    if (this.deploying) return
    this.deploying = true
    this.setPosition(source.x, source.y)
    const distance = Phaser.Math.Distance.Between(source.x, source.y, destination.x, destination.y)
    const duration = Phaser.Math.Clamp(520 + distance * 1.15, 700, 1450)
    this.walkTweens.splice(0).forEach((tween) => tween.stop())
    this.units.forEach((unit, index) => {
      unit.setAlpha(1).setRotation(0)
      const phase = index % 2 === 0 ? 0 : Math.PI
      const homeX = this.homeX[index]
      const walkTween = this.scene.tweens.add({
        targets: unit,
        x: homeX + Math.sin(phase) * 1.5,
        y: Math.sin(phase) * 1.2,
        angle: Math.sin(phase) * 2,
        duration: 230,
        yoyo: true,
        repeat: Math.ceil(duration / 460),
        ease: 'Sine.easeInOut',
      })
      this.walkTweens.push(walkTween)
    })
    this.scene.tweens.add({
      targets: this,
      x: destination.x,
      y: destination.y,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.deploying = false
        this.walkTweens.splice(0).forEach((tween) => tween.stop())
        this.units.forEach((unit, index) => unit.setPosition(this.homeX[index], 0).setAngle(0))
      },
    })
  }

  sync(x: number, y: number, downFlags: boolean[], onDeath?: (at: { x: number; y: number }) => void) {
    this.setPosition(x, y)
    this.units.forEach((img, i) => {
      const down = Boolean(downFlags[i])
      if (down && !this.wasDown[i]) {
        this.scene.tweens.killTweensOf(img)
        // 佣兵接近完全倒地后，再从其当前落地位置生成血滴。
        this.scene.time.delayedCall(320, () => {
          if (!img.active) return
          onDeath?.({ x: this.x + img.x, y: this.y + img.y + 2 })
        })
        this.scene.tweens.add({
          targets: img,
          rotation: i % 2 === 0 ? -1.28 : 1.28,
          y: 9,
          alpha: 0,
          duration: 390,
          ease: 'Sine.easeIn',
        })
      } else if (!down && this.wasDown[i]) {
        this.scene.tweens.killTweensOf(img)
        img.setPosition(this.homeX[i], 0).setRotation(0).setAlpha(1)
      }
      this.wasDown[i] = down
    })
  }

  playAttack(index: number, target: { x: number; y: number }): { x: number; y: number } {
    const slot = Math.abs(index) % this.units.length
    const unit = this.units[slot]
    if (!unit) return { x: this.x, y: this.y }
    const origin = { x: this.x + unit.x, y: this.y + unit.y - 5 }
    const angle = Phaser.Math.Angle.Between(origin.x, origin.y, target.x, target.y)
    const home = this.homeX[slot]
    this.scene.tweens.killTweensOf(unit)
    this.scene.tweens.add({
      targets: unit,
      x: home + Math.cos(angle) * 5,
      y: Math.sin(angle) * 4,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => unit.setPosition(home, 0),
    })
    return origin
  }
}
