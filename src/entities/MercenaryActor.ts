import Phaser from 'phaser'
import type { TowerState } from '../systems/types'

/** 集结点上的佣兵小人可视化,原版对应 `.rally-marker` 元素 */
export class MercenaryActor extends Phaser.GameObjects.Container {
  private readonly units: Phaser.GameObjects.Image[]

  constructor(scene: Phaser.Scene, count: number) {
    super(scene, 0, 0)
    this.units = []
    for (let i = 0; i < count; i += 1) {
      const key = i === 0 ? 'unit-mercenary-shield' : 'unit-mercenary-rifle'
      const img = scene.add.image((i - (count - 1) / 2) * 16, 0, scene.textures.exists(key) ? key : '__MISSING')
      img.setDisplaySize(20, 26)
      this.units.push(img)
      this.add(img)
    }
    scene.add.existing(this)
  }

  sync(x: number, y: number, downFlags: boolean[]) {
    this.setPosition(x, y)
    this.units.forEach((img, i) => img.setAlpha(downFlags[i] ? 0.25 : 1))
  }
}
