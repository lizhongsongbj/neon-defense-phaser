import Phaser from 'phaser'
import { ALL_TOWER_TYPES, TIER4_BRANCHES, TIER4_BRANCH_IMAGE_BY_ID } from '../data/towerExpansion'
import { ENEMY_TYPES } from '../data/enemies'
import { BOSS_TYPES, bossStageTextureKey } from '../data/bosses'
import { MAP_LEVELS } from '../data/maps'
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig'
import { allVoiceFiles } from '../audio/voiceManifest'
import { allMusicFiles } from '../audio/musicManifest'
import { ensureAudioSystems } from '../audio'
import { EventBus, GameEvents } from '../state/EventBus'
import { ENEMY_RUNTIME_ANIMATIONS, enemyAnimationFramePath, enemyAnimationTextureKey } from '../data/enemyRuntimeAnimations'
import { TOWER_ATTACK_FRAMES, TOWER_LEVEL_IMAGE, towerAttackFrameKey, towerLevelTextureKey } from '../data/towerVisuals'
import { UNIT_RUNTIME_FRAMES, UNIT_RUNTIME_MOTIONS, unitAnimationFrameKey } from '../data/unitRuntimeAnimations'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload')
  }

  preload() {
    const barWidth = 420
    const barBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, barWidth, 14, 0x1a1c24).setStrokeStyle(1, 0x2a2f3a)
    const barFill = this.add
      .rectangle(GAME_WIDTH / 2 - barWidth / 2, GAME_HEIGHT / 2, 2, 10, 0x20f4e6)
      .setOrigin(0, 0.5)
    const label = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, '霓虹防线 · 加载资源中', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#8de8ff',
      })
      .setOrigin(0.5)

    this.load.on('progress', (value: number) => {
      barFill.width = Math.max(2, barWidth * value)
    })
    this.load.on('complete', () => {
      barBg.destroy()
      barFill.destroy()
      label.destroy()
    })

    for (const tower of ALL_TOWER_TYPES) {
      this.load.image(`tower-${tower.id}`, tower.image)
    }
    for (const branch of TIER4_BRANCHES) {
      const image = TIER4_BRANCH_IMAGE_BY_ID[branch.id]
      if (image) this.load.image(`tower-tier4-${branch.id}`, image)
    }
    for (const [typeId, images] of Object.entries(TOWER_LEVEL_IMAGE)) {
      images.forEach((image, index) => this.load.image(towerLevelTextureKey(typeId as keyof typeof TOWER_LEVEL_IMAGE, index + 1), image))
    }
    for (const [typeId, frameCount] of Object.entries(TOWER_ATTACK_FRAMES)) {
      for (let frame = 1; frame <= (frameCount ?? 0); frame += 1) {
        this.load.image(towerAttackFrameKey(typeId as keyof typeof TOWER_LEVEL_IMAGE, frame), `assets/animations/towers/runtime/${typeId}/attack/frame-${String(frame).padStart(2, '0')}.png`)
      }
    }
    for (const enemy of Object.values(ENEMY_TYPES)) {
      this.load.image(`enemy-${enemy.id}`, enemy.image)
    }
    for (const boss of Object.values(BOSS_TYPES)) {
      this.load.image(`enemy-${boss.id}`, boss.image)
      for (const [stage, image] of Object.entries(boss.stageImages ?? {})) {
        this.load.image(bossStageTextureKey(boss.id, Number(stage)), image)
      }
    }
    for (const [typeId, motions] of Object.entries(ENEMY_RUNTIME_ANIMATIONS)) {
      for (const [motion, spec] of Object.entries(motions)) {
        if (!spec) continue
        for (let frame = 1; frame <= spec.frames; frame += 1) {
          this.load.image(
            enemyAnimationTextureKey(typeId, motion as 'move' | 'attack' | 'death', frame),
            enemyAnimationFramePath(typeId, motion as 'move' | 'attack' | 'death', frame),
          )
        }
      }
    }
    MAP_LEVELS.forEach((map, index) => {
      if (map.available) this.load.image(`map-${index}`, map.image)
    })
    this.load.image('unit-mercenary-shield', 'assets/units/mercenary-shield.png')
    this.load.image('unit-mercenary-rifle', 'assets/units/mercenary-rifle.png')
    this.load.image('unit-drone-hive', 'assets/generated/cutout/drone-hive-unit-2026-08-24T16-11-53-567Z.png')
    for (const [unitId, motions] of Object.entries(UNIT_RUNTIME_MOTIONS)) {
      for (const motion of motions) {
        for (let frame = 1; frame <= UNIT_RUNTIME_FRAMES; frame += 1) {
          this.load.image(unitAnimationFrameKey(unitId as keyof typeof UNIT_RUNTIME_MOTIONS, motion, frame), `assets/animations/units/runtime/${unitId}/${motion}/frame-${String(frame).padStart(2, '0')}.png`)
        }
      }
    }
    this.load.image('remnant-biological', 'assets/effects/death-remnants/biological-blood-puddle.png')
    this.load.image('remnant-mechanical', 'assets/effects/death-remnants/mechanical-parts-pile.png')
    this.load.image('drone-crash-flame', 'assets/effects/drone-crash-flame.png')
    for (let frame = 1; frame <= 12; frame += 1) {
      const suffix = String(frame).padStart(2, '0')
      this.load.image(`enemy-hijacker-fly-${suffix}`, `assets/animations/enemies/enemy-07-hijack-hovercraft-fly-frames/frame-${suffix}.png`)
    }

    for (let frame = 1; frame <= 16; frame += 1) {
      const suffix = String(frame).padStart(2, '0')
      this.load.image(`fx-hacker-selected-pulse-${suffix}`, `assets/effects/hacker-relay-selected-pulse/frame-${suffix}.png`)
    }
    for (let frame = 1; frame <= 16; frame += 1) {
      const suffix = String(frame).padStart(2, '0')
      this.load.image(`fx-arc-lightning-${suffix}`, `assets/effects/arc-neon-lightning/frame-${suffix}.png`)
    }

    // 基地遭到突破时的即时反馈音效；独立于语音冷却，确保扣血时立即发声。
    this.load.audio('sfx-base-damage', 'assets/audio/sfx/base-damage-impact.wav')

    for (const voice of allVoiceFiles()) {
      this.load.audio(voice.key, voice.path)
    }
    for (const track of allMusicFiles()) {
      this.load.audio(track.key, track.path)
    }
  }

  create() {
    ensureAudioSystems(this.game)
    // 主界面/指挥中心是 HTML 层,战场资源加载完成后只需要通知外层 UI 放开"部署"按钮,
    // 不再像 Phaser 版那样自动切到 CommandCenter 场景。
    this.game.registry.set('assetsReady', true)
    EventBus.emit(GameEvents.AssetsReady)
  }
}

