import Phaser from 'phaser'
import type { TowerState } from '../systems/types'
import { TOWER_ACCENT_COLOR } from '../data/towers'

/** 塔楼的可视化包装,原版对应 DOM `.tower` 按钮元素 */
export class TowerActor extends Phaser.GameObjects.Container {
  readonly tower: TowerState
  private readonly sprite: Phaser.GameObjects.Image
  private readonly levelTag: Phaser.GameObjects.Text
  readonly rangeIndicator: Phaser.GameObjects.Ellipse
  private readonly hitZone: Phaser.GameObjects.Zone
  private readonly baseSize: number

  constructor(scene: Phaser.Scene, state: TowerState, baseSize: number) {
    super(scene, 0, 0)
    this.tower = state
    this.baseSize = baseSize
    const key = `tower-${state.typeId}`

    this.sprite = scene.add.image(0, 0, scene.textures.exists(key) ? key : '__MISSING')
    this.sprite.setDisplaySize(baseSize, baseSize)

    this.levelTag = scene.add
      .text(0, baseSize / 2 - 4, `LV.${state.level}`, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        color: '#fff',
        backgroundColor: '#00000080',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)

    this.rangeIndicator = scene.add
      .ellipse(0, 0, 0, 0, Phaser.Display.Color.HexStringToColor(TOWER_ACCENT_COLOR[state.typeId]).color, 0.12)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(TOWER_ACCENT_COLOR[state.typeId]).color, 0.55)
    this.rangeIndicator.setVisible(false)

    this.hitZone = scene.add.zone(0, 0, baseSize, baseSize).setInteractive({ useHandCursor: true })
    this.add([this.rangeIndicator, this.sprite, this.levelTag, this.hitZone])

    scene.add.existing(this)
  }

  attackOrigin(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.baseSize * 0.4 }
  }
  setLevel(level: number) {
    this.levelTag.setText(`LV.${level}`)
  }

  onPointerDown(handler: () => void) {
    this.hitZone.on('pointerdown', handler)
  }

  showRange(radiusX: number, radiusY: number) {
    this.rangeIndicator.setPosition(0, 0)
    this.rangeIndicator.setSize(radiusX * 2, radiusY * 2)
    this.rangeIndicator.setVisible(true)
  }

  hideRange() {
    this.rangeIndicator.setVisible(false)
  }
}
