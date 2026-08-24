import Phaser from 'phaser'

/** 集结点上的佣兵小队；所有攻击视觉均从佣兵本体发出。 */
export class MercenaryActor extends Phaser.GameObjects.Container {
  private readonly units: Phaser.GameObjects.Image[]
  private readonly homeX: number[]

  constructor(scene: Phaser.Scene, count: number) {
    super(scene, 0, 0)
    this.units = []
    this.homeX = []
    for (let i = 0; i < count; i += 1) {
      const key = i === 0 ? 'unit-mercenary-shield' : 'unit-mercenary-rifle'
      const x = (i - (count - 1) / 2) * 16
      const img = scene.add.image(x, 0, scene.textures.exists(key) ? key : '__MISSING')
      img.setDisplaySize(20, 26)
      this.homeX.push(x)
      this.units.push(img)
      this.add(img)
    }
    this.setDepth(86)
    scene.add.existing(this)
  }

  sync(x: number, y: number, downFlags: boolean[]) {
    this.setPosition(x, y)
    this.units.forEach((img, i) => img.setAlpha(downFlags[i] ? 0.25 : 1))
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
