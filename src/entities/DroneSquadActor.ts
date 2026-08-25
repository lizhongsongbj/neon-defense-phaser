import Phaser from 'phaser'

/** 无人机巢派出的常驻无人机编队；塔体本身不参与射击。 */
export class DroneSquadActor extends Phaser.GameObjects.Container {
  private readonly drones: Phaser.GameObjects.Image[] = []
  private readonly busy: boolean[] = []
  private readonly orbitPositions: Array<{ x: number; y: number }> = []

  constructor(scene: Phaser.Scene, count: number) {
    super(scene, 0, 0)
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / Math.max(1, count) - Math.PI / 2
      const orbit = { x: Math.cos(angle) * 24, y: Math.sin(angle) * 13 - 7 }
      const image = scene.add.image(orbit.x, orbit.y, scene.textures.exists('unit-drone-hive') ? 'unit-drone-hive' : '__MISSING')
      image.setDisplaySize(48, 48).setDepth(2)
      this.drones.push(image)
      this.busy.push(false)
      this.orbitPositions.push(orbit)
      this.add(image)
    }
    this.setDepth(85)
    scene.add.existing(this)
  }

  sync(x: number, y: number, now: number) {
    this.setPosition(x, y)
    this.drones.forEach((drone, index) => {
      if (this.busy[index]) return
      const base = this.orbitPositions[index]
      drone.setPosition(base.x, base.y + Math.sin(now / 360 + index * Math.PI) * 3)
      drone.setRotation(Math.sin(now / 700 + index) * 0.08)
    })
  }

  playDeath(index: number, onDeath: (at: { x: number; y: number }) => void) {
    const slot = Math.abs(index) % this.drones.length
    const drone = this.drones[slot]
    if (!drone) return
    this.busy[slot] = true
    this.scene.tweens.killTweensOf(drone)
    const crashX = drone.x + Phaser.Math.Between(-24, 24)
    const crashY = drone.y + Phaser.Math.Between(32, 52)
    this.scene.tweens.add({
      targets: drone,
      x: crashX,
      y: crashY,
      rotation: drone.rotation + Phaser.Math.FloatBetween(4.5, 7.5),
      alpha: 0.18,
      duration: 380,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // 落地时火苗立即出现，无人机本体再用数帧淡出，让二者短暂重叠。
        const impact = { x: this.x + crashX, y: this.y + crashY }
        onDeath(impact)
        this.scene.tweens.add({
          targets: drone,
          alpha: 0,
          duration: 320,
          ease: 'Sine.easeOut',
          onComplete: () => drone.setVisible(false),
        })
        this.scene.time.delayedCall(5000, () => {
          if (!drone.active) return
          const home = this.orbitPositions[slot]
          drone.setPosition(home.x, home.y).setRotation(0).setAlpha(1).setVisible(true)
          this.busy[slot] = false
        })
      },
    })
  }

  dispatch(index: number, target: { x: number; y: number }, onImpact: () => void) {
    const slot = Math.abs(index) % this.drones.length
    const drone = this.drones[slot]
    if (!drone || this.busy[slot]) {
      onImpact()
      return
    }
    this.busy[slot] = true
    const home = this.orbitPositions[slot]
    const localTarget = { x: target.x - this.x, y: target.y - this.y }
    drone.setRotation(Phaser.Math.Angle.Between(drone.x, drone.y, localTarget.x, localTarget.y) + Math.PI / 2)
    this.scene.tweens.add({
      targets: drone,
      x: localTarget.x,
      y: localTarget.y,
      duration: 230,
      ease: 'Sine.easeIn',
      onComplete: () => {
        onImpact()
        this.scene.tweens.add({
          targets: drone,
          x: home.x,
          y: home.y,
          rotation: 0,
          duration: 280,
          ease: 'Sine.easeOut',
          onComplete: () => { this.busy[slot] = false },
        })
      },
    })
  }
}
