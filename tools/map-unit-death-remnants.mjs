import fs from 'node:fs'
function edit(file, transform){const before=fs.readFileSync(file,'utf8');const after=transform(before);if(after===before)throw new Error(`No change: ${file}`);fs.writeFileSync(file,after,'utf8')}
function once(s,a,b,label){if(!s.includes(a))throw new Error(`Missing ${label}`);return s.replace(a,b)}

edit('src/entities/MercenaryActor.ts', source => {
 let s=source
 s=once(s, `  private readonly homeX: number[]`, `  private readonly homeX: number[]
  private readonly wasDown: boolean[]`, 'merc down state')
 s=once(s, `    this.homeX = []`, `    this.homeX = []
    this.wasDown = []`, 'merc down init')
 s=once(s, `      this.homeX.push(x)`, `      this.homeX.push(x)
      this.wasDown.push(false)`, 'merc down slots')
 s=once(s,
`  sync(x: number, y: number, downFlags: boolean[]) {
    this.setPosition(x, y)
    this.units.forEach((img, i) => img.setAlpha(downFlags[i] ? 0.25 : 1))
  }`,
`  sync(x: number, y: number, downFlags: boolean[], onDeath?: (at: { x: number; y: number }) => void) {
    this.setPosition(x, y)
    this.units.forEach((img, i) => {
      const down = Boolean(downFlags[i])
      if (down && !this.wasDown[i]) onDeath?.({ x: this.x + img.x, y: this.y + img.y + 7 })
      img.setAlpha(down ? 0.25 : 1)
      this.wasDown[i] = down
    })
  }`, 'merc death transition')
 return s
})

edit('src/entities/DroneSquadActor.ts', source => {
 let s=source
 s=once(s, `  dispatch(index: number, target: { x: number; y: number }, onImpact: () => void) {`, `  playDeath(index: number, onDeath: (at: { x: number; y: number }) => void) {
    const slot = Math.abs(index) % this.drones.length
    const drone = this.drones[slot]
    if (!drone) return
    onDeath({ x: this.x + drone.x, y: this.y + drone.y + 5 })
    drone.setVisible(false)
    this.scene.time.delayedCall(5000, () => {
      if (!drone.active) return
      const home = this.orbitPositions[slot]
      drone.setPosition(home.x, home.y).setRotation(0).setVisible(true)
      this.busy[slot] = false
    })
  }

  dispatch(index: number, target: { x: number; y: number }, onImpact: () => void) {`, 'drone death hook')
 return s
})

edit('src/scenes/BattleScene.ts', s => once(s,
`    actor.sync(screen.x, screen.y, tower.mercs.map((m) => Boolean(m.respawnAt)))`,
`    actor.sync(screen.x, screen.y, tower.mercs.map((m) => Boolean(m.respawnAt)), (at) => {
      this.effects.playDeathRemnant(at, false)
      this.voice?.play('street-mercenary', 'down', { chance: 0.45 })
    })`, 'merc remnant hook'))

edit('src/data/effectCatalog.ts', source => {
 let s=source
 s=once(s, `  tags: readonly string[]
}`, `  tags: readonly string[]
  remnantAsset?: string
}`, 'remnant asset field')
 s=once(s,
`const mercenaryDeathEffects: EffectCatalogEntry[] = [`,
`const mercenaryDeathEffects: EffectCatalogEntry[] = [`, 'merc list marker')
 s=s.replace(/\n\]\n\nconst droneDeathEffects: EffectCatalogEntry\[] = \[/, `
].map((entry) => ({ ...entry, remnantAsset: '/assets/effects/death-remnants/biological-blood-puddle.png', layers: [...entry.layers, '血迹残留'] }))

const droneDeathEffects: EffectCatalogEntry[] = [`)
 s=s.replace(/\n\]\n\nexport const EFFECT_CATALOG/, `
].map((entry) => ({ ...entry, remnantAsset: '/assets/effects/death-remnants/mechanical-parts-pile.png', layers: [...entry.layers, '零件残留'] }))

export const EFFECT_CATALOG`)
 return s
})

edit('src/ui/EffectPanel.ts', s => once(s,
`    return \`<span class="effect-stage" aria-hidden="true">`,
`    const remnant = entry.remnantAsset ? \`<img class="effect-remnant" src="\${entry.remnantAsset}" alt="" />\` : ''
    return \`<span class="effect-stage" aria-hidden="true">\${remnant}`, 'effect preview remnant'))

edit('src/styles/theme.css', s => s + `
.effect-remnant { position:absolute; z-index:1; left:50%; bottom:8%; width:64%; height:48%; object-fit:contain; transform:translateX(-50%); opacity:.9; filter:drop-shadow(0 4px 5px rgba(0,0,0,.55)); }
.effect-detail__preview .effect-remnant { width:72%; height:58%; bottom:5%; }
`)
