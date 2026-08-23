/**
 * 确定性伪随机数生成器 —— 原样迁移自 霓虹防线/balance-agent.js
 * (`_0x46ae98` FNV-1a 字符串哈希 + `_0x451608` xorshift-ish PRNG)。
 * 用于按种子重放波次生成与数值模拟,保证同一种子结果可复现。
 */

function fnv1aHash(value: unknown): number {
  let hash = 2166136261
  const str = String(value)
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export type Rng = () => number

export function createRng(seed: unknown): Rng {
  let state = fnv1aHash(seed) || 1
  return function next() {
    state += 1831565813
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
