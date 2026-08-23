import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  preload() {
    // 目前无需在 Boot 阶段加载任何东西,Preload 场景会展示进度条并加载全部资源。
  }

  create() {
    this.scene.start('Preload')
  }
}
