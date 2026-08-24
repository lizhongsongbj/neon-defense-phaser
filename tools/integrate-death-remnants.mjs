import fs from 'node:fs'
function edit(file, transform){const before=fs.readFileSync(file,'utf8');const after=transform(before);if(after===before)throw new Error(`No change: ${file}`);fs.writeFileSync(file,after,'utf8')}
function once(s,a,b,label){if(!s.includes(a))throw new Error(`Missing ${label}`);return s.replace(a,b)}

edit('src/scenes/PreloadScene.ts', s => once(s,
`    this.load.image('unit-drone-hive', 'assets/towers/drone-hive-unit.png')`,
`    this.load.image('unit-drone-hive', 'assets/towers/drone-hive-unit.png')
    this.load.image('remnant-biological', 'assets/effects/death-remnants/biological-blood-puddle.png')
    this.load.image('remnant-mechanical', 'assets/effects/death-remnants/mechanical-parts-pile.png')`, 'preload remnants'))

edit('src/entities/EffectsLayer.ts', source => {
  let s=source
  s=once(s, `  private readonly scene: Phaser.Scene`, `  private readonly scene: Phaser.Scene
  private readonly remnants: Phaser.GameObjects.Image[] = []`, 'remnant list')
  s=once(s, `  playFlash(from: { x: number; y: number }, to: { x: number; y: number }, color: number) {`, `  playDeathRemnant(at: { x: number; y: number }, mechanical: boolean, large = false) {
    const key = mechanical ? 'remnant-mechanical' : 'remnant-biological'
    if (!this.scene.textures.exists(key)) return
    const remnant = this.scene.add.image(at.x, at.y + 7, key)
      .setDisplaySize(large ? 92 : mechanical ? 62 : 55, large ? 70 : mechanical ? 48 : 38)
      .setRotation(Phaser.Math.FloatBetween(-0.35, 0.35))
      .setAlpha(mechanical ? 0.92 : 0.82)
      .setDepth(4)
    this.remnants.push(remnant)
    while (this.remnants.length > 28) this.remnants.shift()?.destroy()
    this.scene.tweens.add({
      targets: remnant,
      alpha: mechanical ? 0.42 : 0.28,
      duration: 9000,
      hold: 3500,
      onComplete: () => {
        const index = this.remnants.indexOf(remnant)
        if (index >= 0) this.remnants.splice(index, 1)
        remnant.destroy()
      },
    })
  }

  playFlash(from: { x: number; y: number }, to: { x: number; y: number }, color: number) {`, 'death remnant method')
  return s
})

edit('src/scenes/BattleScene.ts', s => once(s,
`      if (!leaked) {
        const reward = scaleReward(enemy.reward, this.battle.mapIndex)`,
`      if (!leaked) {
        const deathPosition = boardToScreen(enemyPosition(this.geometry, enemy))
        this.effects.playDeathRemnant(deathPosition, enemy.mechanical, enemy.isBoss)
        const reward = scaleReward(enemy.reward, this.battle.mapIndex)`, 'spawn death remnant'))
