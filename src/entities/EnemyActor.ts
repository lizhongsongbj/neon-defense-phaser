import Phaser from 'phaser'
import type { EnemyState } from '../systems/types'
import { ENEMY_TYPES } from '../data/enemies'
import { BOSS_TYPES, bossStageDefinition } from '../data/bosses'
import {
  ENEMY_RUNTIME_ANIMATIONS,
  enemyAnimationKey,
  enemyAnimationTextureKey,
  type EnemyAnimationMotion,
} from '../data/enemyRuntimeAnimations'

const CLEAN_FALL_DEATH_IDS = new Set(['aerostat', 'devourer', 'faraday', 'hijacker'])

function textureKeyFor(state: EnemyState): string {
  return `enemy-${state.typeId}`
}

function displayName(state: EnemyState): string {
  const def = state.isBoss ? BOSS_TYPES[state.typeId as keyof typeof BOSS_TYPES] : ENEMY_TYPES[state.typeId as keyof typeof ENEMY_TYPES]
  return !state.isBoss && def && 'heavy' in def && def.heavy ? `重型 · ${def.name}` : def?.name ?? state.typeId
}

/** 敌人的可视化包装：图片、逐帧动作、血条、护盾条和名称标签。 */
export class EnemyActor extends Phaser.GameObjects.Container {
  readonly enemy: EnemyState
  private readonly sprite: Phaser.GameObjects.Sprite
  private readonly hpBarBg: Phaser.GameObjects.Rectangle
  private readonly hpBarFill: Phaser.GameObjects.Rectangle
  private readonly shieldBarFill: Phaser.GameObjects.Rectangle
  private readonly tag: Phaser.GameObjects.Text
  private readonly statusRing: Phaser.GameObjects.Graphics
  private readonly barWidth = 46
  private readonly baseSize: number
  private currentMotion: EnemyAnimationMotion | 'static' = 'static'
  private finishing = false

  constructor(scene: Phaser.Scene, state: EnemyState, baseSize: number) {
    super(scene, 0, 0)
    this.enemy = state
    this.baseSize = baseSize

    const moveTexture = enemyAnimationTextureKey(state.typeId, 'move', 1)
    const key = textureKeyFor(state)
    this.sprite = scene.add.sprite(0, 0, scene.textures.exists(moveTexture) ? moveTexture : scene.textures.exists(key) ? key : '__MISSING')
    this.sprite.setDisplaySize(baseSize, baseSize)
    this.ensureRuntimeAnimations()
    this.playMotion('move')

    this.hpBarBg = scene.add.rectangle(0, -baseSize / 2 - 10, this.barWidth, 5, 0x02050a, 0.9)
    this.shieldBarFill = scene.add.rectangle(-this.barWidth / 2, -baseSize / 2 - 10, this.barWidth, 5, 0x7aeeff, 0.92).setOrigin(0, 0.5)
    this.hpBarFill = scene.add.rectangle(-this.barWidth / 2, -baseSize / 2 - 10, this.barWidth, 5, 0xff245d, 1).setOrigin(0, 0.5)

    this.tag = scene.add
      .text(0, -baseSize / 2 - 20, displayName(state), {
        fontFamily: 'sans-serif',
        fontSize: state.isBoss ? '13px' : '10px',
        color: '#f4ffff',
      })
      .setOrigin(0.5, 1)

    this.statusRing = scene.add.graphics()
    this.add([this.statusRing, this.hpBarBg, this.shieldBarFill, this.hpBarFill, this.sprite, this.tag])
    scene.add.existing(this)
  }

  private ensureRuntimeAnimations() {
    const set = ENEMY_RUNTIME_ANIMATIONS[this.enemy.typeId]
    if (!set) return
    for (const motion of ['move', 'attack', 'death'] as const) {
      const spec = set[motion]
      if (!spec) continue
      const key = enemyAnimationKey(this.enemy.typeId, motion)
      if (this.scene.anims.exists(key)) continue
      const frames = Array.from({ length: spec.frames }, (_, index) => ({
        key: enemyAnimationTextureKey(this.enemy.typeId, motion, index + 1),
      })).filter((frame) => this.scene.textures.exists(frame.key))
      if (!frames.length) continue
      this.scene.anims.create({ key, frames, frameRate: spec.frameRate, repeat: spec.repeat })
    }
  }

  private hasMotion(motion: EnemyAnimationMotion) {
    return this.scene.anims.exists(enemyAnimationKey(this.enemy.typeId, motion))
  }

  private playMotion(motion: EnemyAnimationMotion) {
    if (this.finishing || this.currentMotion === motion || !this.hasMotion(motion)) return
    this.currentMotion = motion
    this.sprite.play(enemyAnimationKey(this.enemy.typeId, motion), true)
  }

  /** 每帧根据 enemy 状态同步位置、动作、血量、护盾和异常状态。 */
  syncVisual(screenX: number, screenY: number, now: number) {
    if (this.finishing) return
    this.setPosition(screenX, screenY)
    // 敌人没有独立的攻击状态字段；用短促的周期攻击窗口让已接入的攻击动图在战斗中真正可见。被佣兵/无人机拦截时优先播放攻击动作。
    const attackPulse = this.hasMotion('attack') && ((now + this.enemy.id * 317) % 2400) < 520
    this.playMotion(this.enemy.blocked || attackPulse ? 'attack' : 'move')

    if (this.enemy.air) {
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
    this.statusRing.clear()
    if (now < this.enemy.stunnedUntil) {
      const pulse = 0.65 + Math.sin(this.scene.time.now * 0.03) * 0.25
      this.sprite.setTint(0x7aeeff)
      this.statusRing.lineStyle(3, 0x05c7ff, pulse).strokeCircle(0, 0, this.sprite.displayWidth * 0.54)
      this.statusRing.lineStyle(1, 0xffffff, 0.8).strokeCircle(0, 0, this.sprite.displayWidth * 0.68)
    } else if (now < this.enemy.attackSuppressedUntil) {
      this.sprite.setTint(0xb39bff)
      this.statusRing.lineStyle(3, 0x6435ff, 0.85).strokeRect(-this.sprite.displayWidth * 0.56, -this.sprite.displayHeight * 0.56, this.sprite.displayWidth * 1.12, this.sprite.displayHeight * 1.12)
    } else if (now < this.enemy.skillSlowUntil) {
      this.sprite.setTint(0x7aeeff)
      this.statusRing.lineStyle(2, 0x05c7ff, 0.55).strokeCircle(0, 0, this.sprite.displayWidth * 0.58)
    } else if (this.enemy.isBoss) {
      const phaseColors = this.enemy.typeId === 'eve'
        ? [0x92f6ff, 0xc084ff, 0xff5dcc]
        : [0xffd089, 0xff9368, 0xff4968, 0xff45bb]
      const color = phaseColors[Math.max(0, this.enemy.stage - 1)] ?? 0xffffff
      this.sprite.setTint(color)
      this.statusRing.lineStyle(2, color, 0.66).strokeCircle(0, 0, this.sprite.displayWidth * 0.62)
    } else {
      this.sprite.clearTint()
    }
    if (this.enemy.isBoss) {
      const stage = bossStageDefinition(this.enemy.typeId as keyof typeof BOSS_TYPES, this.enemy.stage)
      const activeComponent = this.enemy.components.find((c) => c.hp > 0)
      const componentLabel = activeComponent ? ` · ${activeComponent.name} ${Math.ceil(activeComponent.hp)}/${Math.ceil(activeComponent.maxHp)}` : ''
      this.tag.setText(`${displayName(this.enemy)} · ${stage.name}${componentLabel}`)
    }
  }

  playExitAnimation(screenX: number, screenY: number, leaked: boolean, onComplete: () => void) {
    if (this.finishing) return
    this.finishing = true
    this.setPosition(screenX, screenY)
    this.sprite.clearTint().setAlpha(1).setY(0).setAngle(0).setDisplaySize(this.baseSize, this.baseSize)
    this.statusRing.clear()
    this.hpBarBg.setVisible(false)
    this.hpBarFill.setVisible(false)
    this.shieldBarFill.setVisible(false)
    this.tag.setVisible(false)

    if (!leaked && !this.enemy.isBoss && CLEAN_FALL_DEATH_IDS.has(this.enemy.typeId)) {
      const cleanTexture = textureKeyFor(this.enemy)
      if (this.scene.textures.exists(cleanTexture)) this.sprite.setTexture(cleanTexture)
      // 四种新增单位使用干净整图作为底帧，倒下动作由 Phaser 做整体旋转、下坠和淡出，避免彩色扫描线。
      this.scene.tweens.add({
        targets: this.sprite,
        angle: { from: 0, to: this.enemy.air ? 62 : 78 },
        y: { from: 0, to: this.baseSize * 0.22 },
        scaleY: { from: 1, to: 0.72 },
        alpha: { from: 1, to: 0 },
        duration: 560,
        ease: 'Cubic.easeIn',
        onComplete,
      })
      return
    }

    const motion: EnemyAnimationMotion = leaked && this.hasMotion('attack') ? 'attack' : 'death'
    if (!this.hasMotion(motion)) {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleX: this.sprite.scaleX * (leaked ? 1.08 : 0.82),
        scaleY: this.sprite.scaleY * (leaked ? 1.08 : 0.82),
        duration: leaked ? 260 : 420,
        onComplete,
      })
      return
    }

    this.currentMotion = motion
    const animationKey = enemyAnimationKey(this.enemy.typeId, motion)
    this.sprite.play(animationKey, true)
    if (leaked) {
      const animation = this.scene.anims.get(animationKey)
      this.scene.time.delayedCall(animation?.duration ?? 650, onComplete)
    } else {
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + animationKey, onComplete)
    }
  }
}
