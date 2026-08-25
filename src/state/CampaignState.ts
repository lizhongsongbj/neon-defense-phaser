/**
 * 跨场景共享的战役进度状态,取代原版散落在 index.html 顶层的模块变量
 * (unlockedMapIndex/completedMaps/researchPoints/towerGrowth 等)。
 * CommandCenterScene 与 BattleScene 都通过 `game.registry` 访问同一个实例。
 */

import { MAP_LEVELS, CAMPAIGN_STARTING_COINS } from '../data/maps'
import { INITIAL_RESEARCH_POINTS, MAX_HEALTH } from '../data/balance'
import { TOWER_IDS, type TowerId } from '../data/towers'
import { loadGame, saveGame, type SavedTower } from '../systems/SaveGame'
import type { Difficulty } from '../data/balance'

export const REGISTRY_KEY = 'campaignState'

export class CampaignState {
  unlockedMapIndex = 0
  completedMaps: boolean[] = MAP_LEVELS.map(() => false)
  researchPoints = INITIAL_RESEARCH_POINTS
  towerGrowth: Record<TowerId, number> = Object.fromEntries(TOWER_IDS.map((id) => [id, 0])) as Record<TowerId, number>

  /**
   * AUTO 演示代理运行期间置为 true,期间所有 `persist()` 调用直接跳过(不写 localStorage),
   * 原 index.html `saveGame()` 里的 `if (window.neonAutoDemo?.active) return;` 短路逻辑。
   * 退出演示时整页 reload 即可无痛丢弃这段时间的所有内存态变更,恢复玩家真实存档。
   */
  demoActive = false

  /** 当前正在进行的关卡状态,进入战斗前由 CommandCenterScene 设置 */
  mapIndex = 0
  difficulty: Difficulty = 'normal'
  gameSpeed: 1 | 2 | 3 = 1
  coins = CAMPAIGN_STARTING_COINS[0]
  health = MAX_HEALTH
  wave = 1
  savedTowers: SavedTower[] = []

  static loadOrCreate(): CampaignState {
    const state = new CampaignState()
    const data = loadGame()
    if (data) {
      state.unlockedMapIndex = data.unlockedMapIndex
      state.completedMaps = data.completedMaps
      state.researchPoints = data.researchPoints
      state.towerGrowth = data.towerGrowth
      state.mapIndex = data.mapIndex
      state.difficulty = data.difficulty
      state.gameSpeed = data.gameSpeed as 1 | 2 | 3
      state.coins = data.coins
      state.health = data.health
      state.wave = data.wave
      state.savedTowers = data.towers

      // 地图阵容已更新为八个新战区：把旧存档安全收束到当前有效关卡范围。
      state.mapIndex = Math.max(0, Math.min(MAP_LEVELS.length - 1, state.mapIndex))
      state.unlockedMapIndex = Math.max(0, Math.min(MAP_LEVELS.length - 1, state.unlockedMapIndex))
      state.completedMaps = MAP_LEVELS.map((_, index) => Boolean(data.completedMaps[index]))
      if (!MAP_LEVELS[state.mapIndex]?.available) {
        state.coins = CAMPAIGN_STARTING_COINS[state.mapIndex] ?? 0
        state.health = MAX_HEALTH
        state.wave = 1
        state.savedTowers = []
      }
    }
    return state
  }

  isMapUnlocked(mapIndex: number): boolean {
    return mapIndex >= 0 && mapIndex <= this.unlockedMapIndex
  }

  mapStatus(mapIndex: number): 'cleared' | 'online' | 'locked' {
    if (this.completedMaps[mapIndex]) return 'cleared'
    return this.isMapUnlocked(mapIndex) ? 'online' : 'locked'
  }

  /** 开始新的一局,原 `resetCampaignMission` */
  startMission(mapIndex: number) {
    this.mapIndex = Math.max(0, Math.min(MAP_LEVELS.length - 1, mapIndex))
    this.coins = CAMPAIGN_STARTING_COINS[this.mapIndex]
    this.health = MAX_HEALTH
    this.wave = 1
    this.savedTowers = []
    this.persist()
  }

  /** 通关结算,原 `window.completeCampaignLevel` */
  completeMission(mapIndex: number): { unlocked: number; newlyUnlocked: boolean } {
    this.completedMaps[mapIndex] = true
    const before = this.unlockedMapIndex
    if (mapIndex === this.unlockedMapIndex && this.unlockedMapIndex < MAP_LEVELS.length - 1) {
      this.unlockedMapIndex += 1
    }
    this.persist()
    return { unlocked: this.unlockedMapIndex, newlyUnlocked: this.unlockedMapIndex > before }
  }

  towerGrowthBonus(id: TowerId) {
    return this.towerGrowth[id] ?? 0
  }

  /** 波次通关奖励研发点,原 `window.awardResearchPoints` */
  addResearchPoints(amount = 1) {
    this.researchPoints += Math.max(0, Math.round(amount))
  }

  persist(extra: Partial<{ towers: SavedTower[]; wave: number }> = {}) {
    if (this.demoActive) return
    if (extra.towers) this.savedTowers = extra.towers
    if (extra.wave) this.wave = extra.wave
    saveGame({
      version: 2,
      coins: this.coins,
      health: this.health,
      towers: this.savedTowers,
      researchPoints: this.researchPoints,
      towerGrowth: this.towerGrowth,
      unlockedMapIndex: this.unlockedMapIndex,
      completedMaps: this.completedMaps,
      mapIndex: this.mapIndex,
      wave: this.wave,
      difficulty: this.difficulty,
      gameSpeed: this.gameSpeed,
    })
  }
}
