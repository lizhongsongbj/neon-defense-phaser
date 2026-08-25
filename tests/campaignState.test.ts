import assert from 'node:assert/strict'
import test from 'node:test'
import { MAP_LEVELS } from '../src/data/maps'
import { CampaignState } from '../src/state/CampaignState'

function withLocalStorage(run: () => void) {
  const values = new Map<string, string>()
  const previous = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  })

  try {
    run()
  } finally {
    if (previous) {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous })
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }
}

test('通关当前最远战区会解锁下一关并保存', () => {
  withLocalStorage(() => {
    const campaign = new CampaignState()
    const result = campaign.completeMission(0)

    assert.equal(campaign.completedMaps[0], true)
    assert.equal(campaign.unlockedMapIndex, 1)
    assert.deepEqual(result, { unlocked: 1, newlyUnlocked: true })

    const restored = CampaignState.loadOrCreate()
    assert.equal(restored.completedMaps[0], true)
    assert.equal(restored.unlockedMapIndex, 1)
  })
})

test('旧存档索引落后时仍根据实际通关关卡补齐解锁进度', () => {
  withLocalStorage(() => {
    const campaign = new CampaignState()
    campaign.unlockedMapIndex = 0

    const result = campaign.completeMission(1)

    assert.equal(campaign.completedMaps[1], true)
    assert.equal(campaign.unlockedMapIndex, 2)
    assert.equal(result.newlyUnlocked, true)
  })
})

test('最终关通关不会越过地图数组范围', () => {
  withLocalStorage(() => {
    const campaign = new CampaignState()
    const finalIndex = MAP_LEVELS.length - 1
    campaign.unlockedMapIndex = finalIndex

    const result = campaign.completeMission(finalIndex)

    assert.equal(campaign.unlockedMapIndex, finalIndex)
    assert.deepEqual(result, { unlocked: finalIndex, newlyUnlocked: false })
  })
})
