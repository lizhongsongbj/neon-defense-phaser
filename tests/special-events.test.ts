import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SPECIAL_EVENTS, chooseSpecialEvent, specialEventHistory, type SpecialEventId } from '../src/data/specialEvents'

const battle = readFileSync(new URL('../src/scenes/BattleScene.ts', import.meta.url), 'utf8')
const hud = readFileSync(new URL('../src/ui/BattleHud.ts', import.meta.url), 'utf8')
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('special event catalog contains exactly three favorable and two unfavorable events', () => {
  assert.equal(SPECIAL_EVENTS.length, 5)
  assert.equal(SPECIAL_EVENTS.filter((event) => event.tone === 'good').length, 3)
  assert.equal(SPECIAL_EVENTS.filter((event) => event.tone === 'bad').length, 2)
  assert.equal(new Set(SPECIAL_EVENTS.map((event) => event.id)).size, 5)
})

test('special events are minor modifiers and never directly alter victory, wave count, base health, or enemy count', () => {
  for (const event of SPECIAL_EVENTS) {
    assert.ok(event.durationSeconds <= 12)
    assert.ok(!('health' in event.modifiers))
    assert.ok(!('wave' in event.modifiers))
    assert.ok(!('enemyCount' in event.modifiers))
    assert.ok(!('victory' in event.modifiers))
  }
})

test('mission event selection starts after wave one, never repeats, and stops after three events', () => {
  const used = new Set<SpecialEventId>()
  let count = 0
  assert.equal(chooseSpecialEvent(0, 1, used, count), null)
  for (let wave = 2; wave <= 10; wave += 1) {
    const selected = chooseSpecialEvent(0, wave, used, count)
    if (!selected) continue
    assert.equal(used.has(selected.id), false)
    used.add(selected.id)
    count += 1
  }
  assert.ok(count > 0)
  assert.ok(count <= 3)
  assert.equal(chooseSpecialEvent(0, 12, used, 3), null)
})

test('event history is reconstructed on resume without repeating earlier mission events', () => {
  const history = specialEventHistory(0, 5)
  assert.equal(history.triggeredCount, 2)
  assert.equal(history.usedIds.size, history.triggeredCount)

  const resumedSelection = chooseSpecialEvent(0, 5, history.usedIds, history.triggeredCount)
  if (resumedSelection) assert.equal(history.usedIds.has(resumedSelection.id), false)
  assert.ok(battle.includes('specialEventHistory(this.battle.mapIndex, this.battle.wave)'))
})

test('battle applies the five event modifier channels without touching win or defeat handlers', () => {
  assert.match(battle, /modifiers\.towerTimeScale/)
  assert.match(battle, /modifiers\.enemySpeedScale/)
  assert.match(battle, /modifiers\.bountyMultiplier/)
  assert.match(battle, /event\.modifiers\.coins/)
  assert.match(battle, /SpecialEventStarted/)
  assert.match(battle, /SpecialEventEnded/)
})

test('battle HUD displays a good-or-bad event banner and lists all events in intelligence', () => {
  assert.match(html, /id="special-event-banner"/)
  assert.match(hud, /SPECIAL_EVENTS\.map/)
  assert.match(hud, /FAVORABLE STREET EVENT/)
  assert.match(hud, /HOSTILE STREET EVENT/)
  assert.match(hud, /街区特殊事件/)
})
