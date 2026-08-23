import type { EnemyId } from './enemies'

/**
 * 每张地图解锁的普通敌人种类,原 gameplay.js `_0x7cafe8`。
 * 索引与 MAP_LEVELS 一一对应(0=H4 ... 5=神舆)。
 */
export const CAMPAIGN_ENEMY_ROSTERS: EnemyId[][] = [
  ['gang', 'riot'],
  ['gang', 'riot', 'ninja'],
  ['gang', 'riot', 'ninja', 'aerostat'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer'],
  ['gang', 'riot', 'ninja', 'aerostat', 'devourer'],
]
