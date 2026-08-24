import fs from 'node:fs'
function edit(file, transform){const before=fs.readFileSync(file,'utf8');const after=transform(before);if(after===before)throw new Error(`No change: ${file}`);fs.writeFileSync(file,after,'utf8')}
function once(s,a,b,label){if(!s.includes(a))throw new Error(`Missing ${label}`);return s.replace(a,b)}

edit('src/systems/towerBehaviors/types.ts', s => once(s, `  chainIndex?: number\n  droneIndex?: number`, `  chainIndex?: number\n  droneIndex?: number\n  unitIndex?: number`, 'unit index'))
edit('src/systems/towerBehaviors/StreetMercenary.ts', s => once(s, `  mercs.forEach((merc) => {`, `  mercs.forEach((merc, unitIndex) => {`, 'merc index').replace(`events.push({ targetId: target.id, damage, kind: 'physical', result, effect: 'mercenary' })`, `events.push({ targetId: target.id, damage, kind: 'physical', result, effect: 'mercenary', unitIndex })`))

edit('src/scenes/BattleScene.ts', source => {
  let s=source
  s=once(s, `import { MercenaryActor } from '../entities/MercenaryActor'`, `import { MercenaryActor } from '../entities/MercenaryActor'\nimport { DroneSquadActor } from '../entities/DroneSquadActor'`, 'drone import')
  s=once(s, `  private mercActors = new Map<string, MercenaryActor>()`, `  private mercActors = new Map<string, MercenaryActor>()\n  private droneActors = new Map<string, DroneSquadActor>()`, 'drone map')
  s=once(s, `    this.mercActors.clear()\n    this.slotMarkers = []`, `    this.mercActors.clear()\n    this.droneActors.clear()\n    this.slotMarkers = []`, 'create clear')
  s=once(s, `    this.towerActors.set(tower.id, actor)\n    this.slotMarkers[slotIndex]?.setVisible(false)`, `    this.towerActors.set(tower.id, actor)\n    if (tower.typeId === 'drone-hive') this.syncDroneActor(tower)\n    this.slotMarkers[slotIndex]?.setVisible(false)`, 'instantiate drone')
  s=once(s, `    this.mercActors.get(tower.id)?.destroy()\n    this.mercActors.delete(tower.id)`, `    this.mercActors.get(tower.id)?.destroy()\n    this.mercActors.delete(tower.id)\n    this.droneActors.get(tower.id)?.destroy()\n    this.droneActors.delete(tower.id)`, 'sell cleanup')
  s=once(s, `    for (const actor of this.mercActors.values()) actor.destroy()\n    this.mercActors.clear()\n    this.slotMarkers.forEach`, `    for (const actor of this.mercActors.values()) actor.destroy()\n    this.mercActors.clear()\n    for (const actor of this.droneActors.values()) actor.destroy()\n    this.droneActors.clear()\n    this.slotMarkers.forEach`, 'reset cleanup')

  const oldBlock=`      if (events.length) {
        const towerScreen = boardToScreen(tower.source)
        for (const event of events) {
          const target = this.battle.enemies.find((e) => e.id === event.targetId)
          if (target) {
            const targetScreen = boardToScreen(enemyPosition(this.geometry, target))
            this.effects.playShot(towerScreen, targetScreen, event.effect)
          }
          if (event.result.destroyedComponent && target?.typeId === 'enforcer') {
            const voiceEvent = ENFORCER_COMPONENT_EVENT[event.result.destroyedComponent]
            if (voiceEvent) this.voice?.play('enforcer', voiceEvent, { priority: 2 })
          }
        }
      }
      this.syncMercenaryActor(tower)`
  const newBlock=`      this.syncMercenaryActor(tower)
      this.syncDroneActor(tower)
      if (events.length) {
        const towerScreen = boardToScreen(tower.source)
        for (const event of events) {
          const target = this.battle.enemies.find((e) => e.id === event.targetId)
          if (target) {
            const targetScreen = boardToScreen(enemyPosition(this.geometry, target))
            if (event.effect === 'mercenary') {
              const origin = this.mercActors.get(tower.id)?.playAttack(event.unitIndex ?? 0, targetScreen)
                ?? boardToScreen(tower.rallyPoint ?? tower.source)
              this.effects.playShot(origin, targetScreen, event.effect)
            } else if (event.effect === 'drone') {
              const squad = this.droneActors.get(tower.id)
              if (squad) squad.dispatch(event.droneIndex ?? 0, targetScreen, () => this.effects.playImpact(targetScreen, event.effect))
              else this.effects.playImpact(targetScreen, event.effect)
            } else {
              this.effects.playShot(towerScreen, targetScreen, event.effect)
            }
          }
          if (event.result.destroyedComponent && target?.typeId === 'enforcer') {
            const voiceEvent = ENFORCER_COMPONENT_EVENT[event.result.destroyedComponent]
            if (voiceEvent) this.voice?.play('enforcer', voiceEvent, { priority: 2 })
          }
        }
      }`
  s=once(s,oldBlock,newBlock,'attack visual routing')

  s=once(s, `  private persistProgress() {`, `  private syncDroneActor(tower: TowerState) {
    if (tower.typeId !== 'drone-hive') return
    let actor = this.droneActors.get(tower.id)
    if (!actor) {
      actor = new DroneSquadActor(this, TOWER_COMBAT['drone-hive'].drones)
      this.droneActors.set(tower.id, actor)
    }
    const screen = boardToScreen(tower.source)
    actor.sync(screen.x, screen.y, this.battle.now)
  }

  private persistProgress() {`, 'sync drone method')
  s=once(s, `import { TOWER_TYPE_BY_ID, type TowerId } from '../data/towers'`, `import { TOWER_COMBAT, TOWER_TYPE_BY_ID, type TowerId } from '../data/towers'`, 'combat import')
  return s
})
