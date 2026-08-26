import Phaser from 'phaser'
import type { TowerState } from '../systems/types'
import { ALL_TOWER_ACCENT_COLOR, TIER4_BRANCH_BY_ID } from '../data/towerExpansion'

/** 塔楼的可视化包装,原版对应 DOM `.tower` 按钮元素 */
export class TowerActor extends Phaser.GameObjects.Container {
  readonly tower: TowerState
  private readonly sprite: Phaser.GameObjects.Image
  private readonly levelTag: Phaser.GameObjects.Text
  readonly rangeIndicator: Phaser.GameObjects.Ellipse
  private readonly hitZone: Phaser.GameObjects.Zone
  private readonly baseSize: number
  private readonly spriteScaleX: number
  private readonly spriteScaleY: number

  constructor(scene: Phaser.Scene, state: TowerState, baseSize: number) {
    super(scene, 0, 0)
    this.tower = state
    this.baseSize = baseSize
    const key = `tower-${state.typeId}`

    this.sprite = scene.add.image(0, 0, scene.textures.exists(key) ? key : '__MISSING')
    this.sprite.setDisplaySize(baseSize, baseSize)
    this.spriteScaleX = this.sprite.scaleX
    this.spriteScaleY = this.sprite.scaleY

    this.levelTag = scene.add
      .text(0, baseSize / 2 - 4, `LV.${state.level}`, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#fff',
        backgroundColor: '#00000080',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)

    this.rangeIndicator = scene.add
      .ellipse(0, 0, 0, 0, Phaser.Display.Color.HexStringToColor(ALL_TOWER_ACCENT_COLOR[state.typeId]).color, 0.12)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(ALL_TOWER_ACCENT_COLOR[state.typeId]).color, 0.55)
    this.rangeIndicator.setVisible(false)

    this.hitZone = scene.add.zone(0, 0, baseSize, baseSize).setInteractive({ useHandCursor: true })
    this.add([this.rangeIndicator, this.sprite, this.levelTag, this.hitZone])

    scene.add.existing(this)
  }

  attackOrigin(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.baseSize * 0.4 }
  }
  setLevel(level: number, branchId?: string | null) {
    const branch = branchId ? TIER4_BRANCH_BY_ID[branchId] : null
    this.levelTag.setText(branch ? `LV.4-${branch.branch}` : `LV.${level}`)
    if (level === 4 && branchId) {
      const key = `tower-tier4-${branchId}`
      if (this.scene.textures.exists(key)) this.sprite.setTexture(key).setDisplaySize(this.baseSize, this.baseSize)
    }
  }

  playAttackFeedback() {
    const typeId = this.tower.typeId
    if (typeId !== 'gravity-nail' && typeId !== 'grey-tide' && typeId !== 'trajectory-rewriter') return

    this.scene.tweens.killTweensOf(this.sprite)
    this.sprite.setPosition(0, 0).setAngle(0).setScale(this.spriteScaleX, this.spriteScaleY).clearTint()

    const tint = typeId === 'gravity-nail' ? 0xc6a3ff : typeId === 'grey-tide' ? 0x9dffc0 : 0x8beaff
    const angle = typeId === 'gravity-nail' ? -4 : typeId === 'grey-tide' ? 3 : 5
    const lift = typeId === 'trajectory-rewriter' ? -4 : -2
    const scaleBoost = typeId === 'gravity-nail' ? 1.1 : typeId === 'grey-tide' ? 1.07 : 1.085
    this.sprite.setTint(tint)
    this.scene.tweens.add({
      targets: this.sprite,
      y: lift,
      angle,
      scaleX: this.spriteScaleX * scaleBoost,
      scaleY: this.spriteScaleY * (typeId === 'trajectory-rewriter' ? .94 : scaleBoost),
      duration: 95,
      yoyo: true,
      repeat: typeId === 'grey-tide' ? 1 : 0,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.sprite.setPosition(0, 0).setAngle(0).setScale(this.spriteScaleX, this.spriteScaleY).clearTint()
      },
    })
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
