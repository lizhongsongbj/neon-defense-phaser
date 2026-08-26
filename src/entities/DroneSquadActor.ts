import Phaser from 'phaser'
import {
  UNIT_RUNTIME_FRAMES,
  unitAnimationFrameKey,
  unitAnimationKey,
  type UnitMotion,
  type UnitVisualId,
} from '../data/unitRuntimeAnimations'

export type DroneVisualVariant = 'scout' | 'bomber' | 'queen'

/** 无人机巢派出的常驻编队：逐帧悬飞、轰炸与坠毁。 */
export class DroneSquadActor extends Phaser.GameObjects.Container {
  readonly visualVariant: DroneVisualVariant
  readonly unitCount: number
  private readonly drones: Phaser.GameObjects.Sprite[] = []
  private readonly busy: boolean[] = []
  private readonly stationOffsets: Array<{ x: number; y: number }> = []
  private stationCenter = { x: 0, y: 0 }
  private deployed = false
  private readonly unitId: UnitVisualId

  constructor(scene: Phaser.Scene, count: number, variant: DroneVisualVariant = 'scout') {
    super(scene, 0, 0)
    this.visualVariant = variant
    this.unitCount = count
    this.unitId = variant === 'bomber' ? 'drone-bomber' : variant === 'queen' ? 'drone-queen' : 'drone-scout'
    this.ensureAnimation('fly', -1, 12)
    this.ensureAnimation('bomb', 0, 16)
    this.ensureAnimation('death', 0, 10)
    for (let i = 0; i < count; i += 1) {
      const launchOffset = { x: (i - (count - 1) / 2) * 10, y: -8 - (i % 2) * 4 }
      const stationOffset = { x: (i - (count - 1) / 2) * 25, y: -12 + (i % 2) * 7 }
      const sprite = scene.add.sprite(launchOffset.x, launchOffset.y, unitAnimationFrameKey(this.unitId, 'fly', 1))
      sprite.setDisplaySize(44, 44).setDepth(2).setAlpha(0.92).play(unitAnimationKey(this.unitId, 'fly'))
      this.drones.push(sprite)
      this.busy.push(false)
      this.stationOffsets.push(stationOffset)
      this.add(sprite)
    }
    this.setDepth(85)
    scene.add.existing(this)
  }

  private ensureAnimation(motion: UnitMotion, repeat: number, frameRate: number) {
    const key = unitAnimationKey(this.unitId, motion)
    if (this.scene.anims.exists(key)) return
    this.scene.anims.create({
      key,
      frames: Array.from({ length: UNIT_RUNTIME_FRAMES }, (_, index) => ({ key: unitAnimationFrameKey(this.unitId, motion, index + 1) })),
      frameRate,
      repeat,
    })
  }

  sync(homeX: number, homeY: number, stationX: number, stationY: number, now: number) {
    this.setPosition(homeX, homeY)
    this.stationCenter = { x: stationX - homeX, y: stationY - homeY }
    if (!this.deployed) {
      this.deployed = true
      this.drones.forEach((drone, index) => {
        this.busy[index] = true
        const target = this.stationPosition(index)
        drone.setRotation(Phaser.Math.Angle.Between(drone.x, drone.y, target.x, target.y) + Math.PI / 2)
        this.scene.tweens.add({
          targets: drone, x: target.x, y: target.y, alpha: 1, duration: 620 + index * 110, ease: 'Sine.easeInOut',
          onComplete: () => { drone.setRotation(0); this.busy[index] = false },
        })
      })
      return
    }
    this.drones.forEach((drone, index) => {
      if (this.busy[index]) return
      if (!drone.anims.isPlaying) drone.play(unitAnimationKey(this.unitId, 'fly'))
      const base = this.stationPosition(index)
      drone.setPosition(base.x, base.y + Math.sin(now / 330 + index * Math.PI) * 3)
      drone.setRotation(Math.sin(now / 620 + index) * 0.075)
    })
  }

  private stationPosition(index: number) {
    const offset = this.stationOffsets[index]
    return { x: this.stationCenter.x + offset.x, y: this.stationCenter.y + offset.y }
  }

  playDeath(index: number, onDeath: (at: { x: number; y: number }) => void) {
    const slot = Math.abs(index) % this.drones.length
    const drone = this.drones[slot]
    if (!drone) return
    this.busy[slot] = true
    this.scene.tweens.killTweensOf(drone)
    drone.play(unitAnimationKey(this.unitId, 'death'), true)
    const crashX = drone.x + Phaser.Math.Between(-24, 24)
    const crashY = drone.y + Phaser.Math.Between(32, 52)
    this.scene.tweens.add({
      targets: drone, x: crashX, y: crashY, rotation: drone.rotation + Phaser.Math.FloatBetween(4.5, 7.5), alpha: 0.18, duration: 430, ease: 'Quad.easeIn',
      onComplete: () => {
        onDeath({ x: this.x + crashX, y: this.y + crashY })
        this.scene.tweens.add({ targets: drone, alpha: 0, duration: 320, ease: 'Sine.easeOut', onComplete: () => drone.setVisible(false) })
        this.scene.time.delayedCall(5000, () => {
          if (!drone.active) return
          const station = this.stationPosition(slot)
          drone.setPosition(station.x, station.y).setRotation(0).setAlpha(1).setVisible(true).play(unitAnimationKey(this.unitId, 'fly'))
          this.busy[slot] = false
        })
      },
    })
  }

  dispatch(index: number, target: { x: number; y: number }, onImpact: () => void) {
    const slot = Math.abs(index) % this.drones.length
    const drone = this.drones[slot]
    if (!drone || this.busy[slot]) { onImpact(); return }
    this.busy[slot] = true
    const station = this.stationPosition(slot)
    const localTarget = { x: target.x - this.x, y: target.y - this.y }
    drone.play(unitAnimationKey(this.unitId, 'bomb'), true)
    drone.setRotation(Phaser.Math.Angle.Between(drone.x, drone.y, localTarget.x, localTarget.y) + Math.PI / 2)
    this.scene.tweens.add({
      targets: drone, x: localTarget.x, y: localTarget.y, duration: 190, ease: 'Sine.easeIn',
      onComplete: () => {
        onImpact()
        this.scene.tweens.add({
          targets: drone, x: station.x, y: station.y, rotation: 0, duration: 240, ease: 'Sine.easeOut',
          onComplete: () => { drone.play(unitAnimationKey(this.unitId, 'fly')); this.busy[slot] = false },
        })
      },
    })
  }
}
