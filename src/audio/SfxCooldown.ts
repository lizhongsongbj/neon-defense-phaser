const SFX_COOLDOWN_MS = 20_000
let lastSfxAt = -Infinity

/** 全局战斗音效节流：音乐和角色语音不受此限制。 */
export function claimBattleSfx(now = performance.now()): boolean {
  if (now - lastSfxAt < SFX_COOLDOWN_MS) return false
  lastSfxAt = now
  return true
}

export function resetBattleSfxCooldown() {
  lastSfxAt = -Infinity
}
