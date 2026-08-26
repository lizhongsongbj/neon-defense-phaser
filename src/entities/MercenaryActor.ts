import Phaser from 'phaser'
import {
  UNIT_RUNTIME_FRAMES,
  unitAnimationFrameKey,
  unitAnimationKey,
  type UnitMotion,
  type UnitVisualId,
} from '../data/unitRuntimeAnimations'

const MERCENARY_WIDTH = 40
const MERCENARY_HEIGHT = 52
const MERCENARY_SPACING = 32
export type MercenaryVisualVariant = 'standard' | 'blade'

/** 集结点上的佣兵小队；逐帧行走、攻击与死亡均来自佣兵本体。 */
export class MercenaryActor extends Phaser.GameObjects.Container {
  readonly visualVariant: MercenaryVisualVariant
  readonly unitCount: number
  private readonly units: Phaser.GameObjects.Sprite[] = []
  private readonly unitIds: UnitVisualId[] = []
  private readonly homeX: number[] = []
  private readonly wasDown: boolean[] = []
  private deploying = false

  constructor(scene: Phaser.Scene, count: number, variant: MercenaryVisualVariant = 'standard') {
    super(scene, 0, 0)
    this.visualVariant = variant
    this.unitCount = count
    for (let i = 0; i < count; i += 1) {
      const id: UnitVisualId = variant === 'blade' ? 'merc-blade' : i === 0 ? 'merc-shield' : 'merc-rifle'
      this.ensureAnimation(id, 'walk', -1, 10)
      this.ensureAnimation(id, 'attack', 0, 16)
      this.ensureAnimation(id, 'death', 0, 10)
      const x = (i - (count - 1) / 2) * MERCENARY_SPACING
      const sprite = scene.add.sprite(x, 0, unitAnimationFrameKey(id, 'walk', 1)).setDisplaySize(MERCENARY_WIDTH, MERCENARY_HEIGHT)
      this.homeX.push(x)
      this.wasDown.push(false)
      this.unitIds.push(id)
      this.units.push(sprite)
      this.add(sprite)
    }
    this.setDepth(86)
    scene.add.existing(this)
  }

  private ensureAnimation(id: UnitVisualId, motion: UnitMotion, repeat: number, frameRate: number) {
    const key = unitAnimationKey(id, motion)
    if (this.scene.anims.exists(key)) return
    this.scene.anims.create({
      key,
      frames: Array.from({ length: UNIT_RUNTIME_FRAMES }, (_, index) => ({ key: unitAnimationFrameKey(id, motion, index + 1) })),
      frameRate,
      repeat,
    })
  }

  deployFrom(source: { x: number; y: number }, destination: { x: number; y: number }) {
    if (this.deploying) return
    this.deploying = true
    this.setPosition(source.x, source.y)
    const distance = Phaser.Math.Distance.Between(source.x, source.y, destination.x, destination.y)
    const duration = Phaser.Math.Clamp(520 + distance * 1.15, 700, 1450)
    this.units.forEach((unit, index) => unit.setAlpha(1).setRotation(0).play(unitAnimationKey(this.unitIds[index], 'walk'), true))
    this.scene.tweens.add({
      targets: this,
      x: destination.x,
      y: destination.y,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.deploying = false
        this.units.forEach((unit, index) => {
          unit.stop().setTexture(unitAnimationFrameKey(this.unitIds[index], 'walk', 1)).setPosition(this.homeX[index], 0).setAngle(0)
        })
      },
    })
  }

  sync(x: number, y: number, downFlags: boolean[], onDeath?: (at: { x: number; y: number }) => void) {
    if (!this.deploying) this.setPosition(x, y)
    this.units.forEach((unit, i) => {
      const down = Boolean(downFlags[i])
      if (down && !this.wasDown[i]) {
        this.scene.tweens.killTweensOf(unit)
        unit.play(unitAnimationKey(this.unitIds[i], 'death'), true)
        this.scene.time.delayedCall(320, () => {
          if (!unit.active) return
          onDeath?.({ x: this.x + unit.x, y: this.y + unit.y + 2 })
        })
        this.scene.tweens.add({ targets: unit, y: 9, alpha: 0, delay: 230, duration: 260, ease: 'Sine.easeIn' })
      } else if (!down && this.wasDown[i]) {
        this.scene.tweens.killTweensOf(unit)
        unit.stop().setTexture(unitAnimationFrameKey(this.unitIds[i], 'walk', 1)).setPosition(this.homeX[i], 0).setRotation(0).setAlpha(1)
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
    unit.play(unitAnimationKey(this.unitIds[slot], 'attack'), true)
    this.scene.tweens.add({
      targets: unit,
      x: home + Math.cos(angle) * 5,
      y: Math.sin(angle) * 4,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => unit.setPosition(home, 0),
    })
    return origin
  }
}
