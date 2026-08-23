/**
 * 原样迁移自 霓虹防线/wave-economy.js (window.WaveEconomy)。
 */

export const COUNTDOWN_SECONDS = 12
export const MIN_REWARD = 5
export const MAX_REWARD = 25

/** 提前开波奖励:剩余等待时间越长,奖励越高,封顶于 MAX_REWARD */
export function earlyWaveReward(secondsRemaining: number): number {
  const seconds = Number(secondsRemaining)
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  const ratio = Math.min(1, seconds / COUNTDOWN_SECONDS)
  return Math.max(MIN_REWARD, Math.min(MAX_REWARD, Math.ceil(ratio * MAX_REWARD)))
}
