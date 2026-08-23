import Phaser from 'phaser'
import { TOWER_TYPES } from '../data/towers'
import { ENEMY_TYPES } from '../data/enemies'
import { BOSS_TYPES } from '../data/bosses'
import { MAP_LEVELS } from '../data/maps'
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig'
import { allVoiceFiles } from '../audio/voiceManifest'
import { allMusicFiles } from '../audio/musicManifest'
import { ensureAudioSystems } from '../audio'
import { EventBus, GameEvents } from '../state/EventBus'

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

    for (const tower of TOWER_TYPES) {
      this.load.image(`tower-${tower.id}`, tower.image)
    }
    for (const enemy of Object.values(ENEMY_TYPES)) {
      this.load.image(`enemy-${enemy.id}`, enemy.image)
    }
    for (const boss of Object.values(BOSS_TYPES)) {
      this.load.image(`enemy-${boss.id}`, boss.image)
    }
    MAP_LEVELS.forEach((map, index) => {
      this.load.image(`map-${index}`, map.image)
    })
    this.load.image('unit-mercenary-shield', 'assets/units/mercenary-shield.png')
    this.load.image('unit-mercenary-rifle', 'assets/units/mercenary-rifle.png')
    this.load.image('unit-drone-hive', 'assets/towers/drone-hive-unit.png')

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
