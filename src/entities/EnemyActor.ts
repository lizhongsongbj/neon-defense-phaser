import Phaser from 'phaser'
import type { EnemyState } from '../systems/types'
import { ENEMY_TYPES } from '../data/enemies'
import { BOSS_TYPES } from '../data/bosses'

function textureKeyFor(state: EnemyState): string {
  return `enemy-${state.typeId}`
}

function displayName(state: EnemyState): string {
  const def = state.isBoss ? BOSS_TYPES[state.typeId as keyof typeof BOSS_TYPES] : ENEMY_TYPES[state.typeId as keyof typeof ENEMY_TYPES]
  return !state.isBoss && def && 'heavy' in def && def.heavy ? `重型 · ${def.name}` : def?.name ?? state.typeId
}

/**
 * 敌人的可视化包装,原版对应 DOM `.enemy` 元素(图片 + 血条 + 护盾条 + 名称标签)。
 */
export class EnemyActor extends Phaser.GameObjects.Container {
  readonly enemy: EnemyState
  private readonly sprite: Phaser.GameObjects.Sprite
  private readonly hpBarBg: Phaser.GameObjects.Rectangle
  private readonly hpBarFill: Phaser.GameObjects.Rectangle
  private readonly shieldBarFill: Phaser.GameObjects.Rectangle
  private readonly tag: Phaser.GameObjects.Text
  private readonly barWidth = 46

  constructor(scene: Phaser.Scene, state: EnemyState, baseSize: number) {
    super(scene, 0, 0)
    this.enemy = state

    const key = textureKeyFor(state)
    const hijackerFlightKey = 'enemy-hijacker-flight'
    const useHijackerFlight = state.typeId === 'hijacker' && scene.textures.exists('enemy-hijacker-fly-01')
    this.sprite = scene.add.sprite(0, 0, useHijackerFlight ? 'enemy-hijacker-fly-01' : scene.textures.exists(key) ? key : '__MISSING')
    this.sprite.setDisplaySize(baseSize, baseSize)
    if (useHijackerFlight) {
      if (!scene.anims.exists(hijackerFlightKey)) {
        scene.anims.create({
          key: hijackerFlightKey,
          frames: Array.from({ length: 12 }, (_, index) => ({ key: `enemy-hijacker-fly-${String(index + 1).padStart(2, '0')}` })),
          frameRate: 15,
          repeat: -1,
        })
      }
      this.sprite.play(hijackerFlightKey)
    }

    this.hpBarBg = scene.add.rectangle(0, -baseSize / 2 - 10, this.barWidth, 5, 0x1a1a1a, 0.85)
    this.shieldBarFill = scene.add.rectangle(-this.barWidth / 2, -baseSize / 2 - 10, this.barWidth, 5, 0x79e8ff, 0.9).setOrigin(0, 0.5)
    this.hpBarFill = scene.add.rectangle(-this.barWidth / 2, -baseSize / 2 - 10, this.barWidth, 5, 0xff3b6b, 1).setOrigin(0, 0.5)

    this.tag = scene.add
      .text(0, -baseSize / 2 - 20, displayName(state), {
        fontFamily: 'sans-serif',
        fontSize: state.isBoss ? '13px' : '10px',
        color: '#e8ffff',
      })
      .setOrigin(0.5, 1)

    this.add([this.hpBarBg, this.shieldBarFill, this.hpBarFill, this.sprite, this.tag])
    scene.add.existing(this)
  }

  /** 每帧根据 enemy 状态同步位置/血量/护盾/相位透明度,position 为屏幕坐标 */
  syncVisual(screenX: number, screenY: number) {
    this.setPosition(screenX, screenY)
    if (this.enemy.air) {
      // Air units use the corporate aerostat's stable hover: slow lift with minor attitude correction.
      const hoverPhase = this.scene.time.now * 0.0022 + this.enemy.id * 0.73
      const hijacker = this.enemy.typeId === 'hijacker'
      this.sprite.setY(Math.sin(hoverPhase) * (hijacker ? 2 : 4) - 4)
      this.sprite.setAngle(Math.sin(hoverPhase * 0.72) * (hijacker ? 0.7 : 1.4))
    } else {
      this.sprite.setY(0)
      this.sprite.setAngle(0)
    }
    const hpRatio = Math.max(0, this.enemy.hp / this.enemy.maxHp)
    const shieldRatio = this.enemy.maxShield ? Math.max(0, this.enemy.shield / this.enemy.maxShield) : 0
    this.hpBarFill.width = this.barWidth * hpRatio
    this.shieldBarFill.width = this.barWidth * shieldRatio
    this.sprite.setAlpha(this.enemy.phased ? 0.35 : 1)
    if (this.enemy.isBoss) {
      const activeComponent = this.enemy.components.find((c) => c.hp > 0)
      this.tag.setText(activeComponent ? `${displayName(this.enemy)} · ${activeComponent.name}` : `${displayName(this.enemy)} · 阶段 ${this.enemy.stage}`)
    }
  }
}
