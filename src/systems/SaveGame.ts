/**
 * 存档系统 —— 原样迁移自 霓虹防线/index.html 中的 `saveGame` / `restoreGame`。
 * schema 版本沿用原版 `version: 2`,字段结构保持一致以便未来可能的存档互通。
 */

import { MAP_LEVELS } from '../data/maps'
import { SAVE_KEY, SAVE_VERSION, type Difficulty } from '../data/balance'
import { type TowerId } from '../data/towers'
import { GROWTH_TOWER_IDS, type AllTowerId } from '../data/towerExpansion'

export interface SavedTower {
  slot: number
  type: TowerId
  level: number
  spent: number
  rallyX: number | null
  rallyY: number | null
}

export interface SaveData {
  version: number
  coins: number
  health: number
  towers: SavedTower[]
  researchPoints: number
  towerGrowth: Record<AllTowerId, number>
  unlockedMapIndex: number
  completedMaps: boolean[]
  mapIndex: number
  wave: number
  difficulty: Difficulty
  gameSpeed: number
  selectedTowerIds?: AllTowerId[]
}

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, version: SAVE_VERSION }))
  } catch (error) {
    console.warn('Unable to save game state.', error)
  }
}

export function loadGame(): SaveData | null {
  let parsed: any
  try {
    parsed = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')
  } catch (error) {
    console.warn('Unable to read game state.', error)
    return null
  }
  if (!parsed || ![1, 2].includes(parsed.version) || !Array.isArray(parsed.towers)) {
    return null
  }

  const mapCount = MAP_LEVELS.length
  const mapIndex = Math.max(0, Math.min(mapCount - 1, Math.round(Number(parsed.mapIndex) || 0)))
  const unlockedMapIndex = Number.isFinite(parsed.unlockedMapIndex)
    ? Math.max(0, Math.min(mapCount - 1, Math.round(parsed.unlockedMapIndex)))
    : mapIndex
  const completedMaps = MAP_LEVELS.map(
    (_, i) => Boolean(parsed.completedMaps?.[i]) || i < unlockedMapIndex,
  )
  const towerGrowth = Object.fromEntries(
    GROWTH_TOWER_IDS.map((id) => [id, Math.max(0, Math.min(3, Math.round(Number(parsed.towerGrowth?.[id]) || 0)))]),
  ) as Record<AllTowerId, number>

  return {
    version: SAVE_VERSION,
    coins: Number.isFinite(parsed.coins) ? Math.max(0, Math.round(parsed.coins)) : 700,
    health: Number.isFinite(parsed.health) ? Math.max(0, Math.min(10, Math.round(parsed.health))) : 10,
    towers: parsed.towers,
    researchPoints: Number.isFinite(parsed.researchPoints) ? Math.max(0, Math.round(parsed.researchPoints)) : 5,
    towerGrowth,
    unlockedMapIndex,
    completedMaps,
    mapIndex,
    wave: Math.max(1, Math.round(Number(parsed.wave) || 1)),
    difficulty: ['easy', 'normal', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : 'normal',
    gameSpeed: [1, 2, 3].includes(Number(parsed.gameSpeed)) ? Number(parsed.gameSpeed) : 1,
    selectedTowerIds: Array.isArray(parsed.selectedTowerIds) ? parsed.selectedTowerIds : undefined,
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* ignore */
  }
}
