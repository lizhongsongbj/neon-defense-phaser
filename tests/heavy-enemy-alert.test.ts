import test from 'node:test'
import assert from 'node:assert/strict'
import { ENEMY_TYPES, consumeHeavyEnemyFirstAppearance, type EnemyId } from '../src/data/enemies'

test('劫持浮游体和骨铠破障兽被标记为重型敌人', () => {
  assert.equal(ENEMY_TYPES.hijacker.heavy, true)
  assert.equal(ENEMY_TYPES.bonebreaker.heavy, true)
  assert.deepEqual(
    Object.values(ENEMY_TYPES).filter((enemy) => enemy.heavy).map((enemy) => enemy.id).sort(),
    ['bonebreaker', 'hijacker'],
  )
  assert.ok(ENEMY_TYPES.hijacker.heavyAlert?.description.includes('不受佣兵拦截'))
  assert.ok(ENEMY_TYPES.bonebreaker.heavyAlert?.effect.includes('能量'))
})

test('每局战斗中每种重型敌人只在首次出现时触发战术警报', () => {
  const seen = new Set<EnemyId>()
  assert.equal(consumeHeavyEnemyFirstAppearance(seen, 'hijacker')?.id, 'hijacker')
  assert.equal(consumeHeavyEnemyFirstAppearance(seen, 'hijacker'), null)
  assert.equal(consumeHeavyEnemyFirstAppearance(seen, 'bonebreaker')?.id, 'bonebreaker')
  assert.equal(consumeHeavyEnemyFirstAppearance(seen, 'bonebreaker'), null)
  assert.equal(consumeHeavyEnemyFirstAppearance(seen, 'gang'), null)
  assert.deepEqual([...seen].sort(), ['bonebreaker', 'hijacker'])
})
