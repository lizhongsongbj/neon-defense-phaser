import Phaser from 'phaser'
import type { TowerState } from '../systems/types'
import { ALL_TOWER_ACCENT_COLOR, TIER4_BRANCH_BY_ID, type AllTowerId } from '../data/towerExpansion'
import {
  TOWER_ATTACK_FRAMES,
  towerAttackAnimationKey,
  towerAttackFrameKey,
  towerLevelTextureKey,
} from '../data/towerVisuals'

/** 塔楼的战场可视化：等级外观、攻击逐帧动画、射程和点击区域。 */
export class TowerActor extends Phaser.GameObjects.Container {
  readonly tower: TowerState
  private readonly sprite: Phaser.GameObjects.Image
  private readonly attackSprite: Phaser.GameObjects.Sprite
  private readonly levelTag: Phaser.GameObjects.Text
  readonly rangeIndicator: Phaser.GameObjects.Ellipse
  private readonly hitZone: Phaser.GameObjects.Zone
  private readonly baseSize: number

  constructor(scene: Phaser.Scene, state: TowerState, baseSize: number) {
    super(scene, 0, 0)
    this.tower = state
    this.baseSize = baseSize
    const levelKey = towerLevelTextureKey(state.typeId as AllTowerId, state.level)
    const fallbackKey = `tower-${state.typeId}`

    this.sprite = scene.add.image(0, 0, scene.textures.exists(levelKey) ? levelKey : scene.textures.exists(fallbackKey) ? fallbackKey : '__MISSING')
    this.sprite.setDisplaySize(baseSize, baseSize)

    const firstAttackFrame = towerAttackFrameKey(state.typeId as AllTowerId, 1)
    this.attackSprite = scene.add.sprite(0, 0, scene.textures.exists(firstAttackFrame) ? firstAttackFrame : '__MISSING')
      .setDisplaySize(baseSize, baseSize)
      .setVisible(false)
      .setDepth(2)
    this.ensureAttackAnimation()

    this.levelTag = scene.add
      .text(0, baseSize / 2 - 4, `LV.${state.level}`, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#fff',
        backgroundColor: '#00000080',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(3)

    this.rangeIndicator = scene.add
      .ellipse(0, 0, 0, 0, Phaser.Display.Color.HexStringToColor(ALL_TOWER_ACCENT_COLOR[state.typeId]).color, 0.12)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(ALL_TOWER_ACCENT_COLOR[state.typeId]).color, 0.55)
    this.rangeIndicator.setVisible(false)

    this.hitZone = scene.add.zone(0, 0, baseSize, baseSize).setInteractive({ useHandCursor: true }).setDepth(4)
    this.add([this.rangeIndicator, this.sprite, this.attackSprite, this.levelTag, this.hitZone])
    scene.add.existing(this)
  }

  private ensureAttackAnimation() {
    const typeId = this.tower.typeId as AllTowerId
    const frames = TOWER_ATTACK_FRAMES[typeId]
    if (!frames) return
    const key = towerAttackAnimationKey(typeId)
    if (this.scene.anims.exists(key)) return
    this.scene.anims.create({
      key,
      frames: Array.from({ length: frames }, (_, index) => ({ key: towerAttackFrameKey(typeId, index + 1) })),
      frameRate: 18,
      repeat: 0,
    })
  }

  attackOrigin(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.baseSize * 0.4 }
  }

  setLevel(level: number, branchId?: string | null) {
    const branch = branchId ? TIER4_BRANCH_BY_ID[branchId] : null
    this.levelTag.setText(branch ? `LV.4-${branch.branch}` : `LV.${level}`)
    const key = level === 4 && branchId
      ? `tower-tier4-${branchId}`
      : towerLevelTextureKey(this.tower.typeId as AllTowerId, level)
    if (this.scene.textures.exists(key)) this.sprite.setTexture(key).setDisplaySize(this.baseSize, this.baseSize)
  }

  playAttackFeedback() {
    const typeId = this.tower.typeId as AllTowerId
    const animationKey = towerAttackAnimationKey(typeId)
    if (TOWER_ATTACK_FRAMES[typeId] && this.scene.anims.exists(animationKey)) {
      this.attackSprite.setVisible(true).setAlpha(1).setPosition(0, 0).setAngle(0).setDisplaySize(this.baseSize, this.baseSize)
      this.sprite.setVisible(false)
      this.attackSprite.play(animationKey, true)
      this.attackSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + animationKey, () => {
        this.attackSprite.setVisible(false)
        this.sprite.setVisible(true)
      })
      return
    }

    if (typeId !== 'gravity-nail' && typeId !== 'grey-tide' && typeId !== 'trajectory-rewriter') return
    this.scene.tweens.killTweensOf(this.sprite)
    this.sprite.setPosition(0, 0).setAngle(0).clearTint().setDisplaySize(this.baseSize, this.baseSize)
    const startScaleX = this.sprite.scaleX
    const startScaleY = this.sprite.scaleY
    const tint = typeId === 'gravity-nail' ? 0xc6a3ff : typeId === 'grey-tide' ? 0x9dffc0 : 0x8beaff
    const angle = typeId === 'gravity-nail' ? -4 : typeId === 'grey-tide' ? 3 : 5
    const lift = typeId === 'trajectory-rewriter' ? -4 : -2
    const scaleBoost = typeId === 'gravity-nail' ? 1.1 : typeId === 'grey-tide' ? 1.07 : 1.085
    this.sprite.setTint(tint)
    this.scene.tweens.add({
      targets: this.sprite,
      y: lift,
      angle,
      scaleX: startScaleX * scaleBoost,
      scaleY: startScaleY * (typeId === 'trajectory-rewriter' ? .94 : scaleBoost),
      duration: 95,
      yoyo: true,
      repeat: typeId === 'grey-tide' ? 1 : 0,
      ease: 'Sine.easeInOut',
      onComplete: () => this.sprite.setPosition(0, 0).setAngle(0).setScale(startScaleX, startScaleY).clearTint(),
    })
  }

  onPointerDown(handler: () => void) { this.hitZone.on('pointerdown', handler) }
  showRange(radiusX: number, radiusY: number) {
    this.rangeIndicator.setPosition(0, 0).setSize(radiusX * 2, radiusY * 2).setVisible(true)
  }
  hideRange() { this.rangeIndicator.setVisible(false) }
}
