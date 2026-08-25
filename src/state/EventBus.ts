import Phaser from 'phaser'
import type { Difficulty } from '../data/balance'
import type { AllTowerId } from '../data/towerExpansion'

/**
 * BattleScene 与 UiScene 并行运行,通过这个共享事件总线通信,
 * 取代原版里 DOM 事件/全局函数调用的角色。
 */
export const EventBus = new Phaser.Events.EventEmitter()

export interface SlotSelectedPayload {
  slotIndex: number
  screenX: number
  screenY: number
  hasTower: boolean
  coins: number
}

export interface TowerSelectedPayload {
  towerId: string
}

export interface HudTowerSnapshot {
  slotIndex: number
  typeId: AllTowerId
  level: 1 | 2 | 3
}

export interface BattleHudPayload {
  coins: number
  health: number
  wave: number
  totalWaves: number
  maxHealth: number
  speed: number
  waveActive: boolean
  /** 下一波整备倒计时(秒),0 表示可立即发动或战斗中,原 `nextWaveCountdown` */
  countdown: number
  deployedCount: number
  maxSlots: number
  enemyCount: number
  mapIndex: number
  difficulty: Difficulty
  /** AUTO 演示代理决策所需的塔位快照,原 `window.neonDemoGame.snapshot().towers` */
  towers: HudTowerSnapshot[]
}

export interface WaveClearedPayload {
  nextWave: number
  reward: number
  researchPoints: number
}

export interface SpecialEventPayload {
  id: string
  tone: 'good' | 'bad'
  title: string
  source: string
  description: string
  effectLabel: string
  durationSeconds: number
}

export const GameEvents = {
  SlotClicked: 'slot-clicked',
  TowerClicked: 'tower-clicked',
  BuildTower: 'build-tower',
  UpgradeTower: 'upgrade-tower',
  SellTower: 'sell-tower',
  ToggleRally: 'toggle-rally',
  ClearSelection: 'clear-selection',
  HudUpdate: 'hud-update',
  TowerInfoUpdate: 'tower-info-update',
  SetSpeed: 'set-speed',
  StartNextWave: 'start-next-wave',
  GameOver: 'game-over',
  Victory: 'victory',
  ReturnToCommandCenter: 'return-to-command-center',
  WaveCleared: 'wave-cleared',
  VoiceStart: 'voice-start',
  VoiceEnd: 'voice-end',
  AssetsReady: 'assets-ready',
  ResetDeployment: 'reset-deployment',
  EarlyWaveBonus: 'early-wave-bonus',
  SpecialEventStarted: 'special-event-started',
  SpecialEventEnded: 'special-event-ended',
  AchievementSignal: 'achievement-signal',
  AchievementUnlocked: 'achievement-unlocked',
  AchievementStateChanged: 'achievement-state-changed',
  /** AUTO 演示代理请求重开指定关卡(不持久化存档),原 `window.neonDemoGame.restart` */
  RestartBattle: 'restart-battle',
} as const
