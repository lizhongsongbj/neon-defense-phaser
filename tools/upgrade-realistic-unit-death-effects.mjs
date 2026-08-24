import fs from 'node:fs'
function edit(file, transform){const before=fs.readFileSync(file,'utf8');const after=transform(before);if(after===before)throw new Error(`No change: ${file}`);fs.writeFileSync(file,after,'utf8')}
function once(s,a,b,label){if(!s.includes(a))throw new Error(`Missing ${label}`);return s.replace(a,b)}

edit('src/entities/EffectsLayer.ts', source => {
  let s=source
  s=once(s, `  playDeathRemnant(at: { x: number; y: number }, mechanical: boolean, large = false) {`, `  playMercenaryDeath(at: { x: number; y: number }) {
    for (let i = 0; i < 9; i += 1) {
      const angle = Phaser.Math.FloatBetween(Math.PI * 0.08, Math.PI * 0.92)
      const distance = Phaser.Math.Between(8, 28)
      const droplet = this.scene.add.circle(at.x, at.y, Phaser.Math.Between(1, 3), i % 4 === 0 ? 0x28d9e8 : 0x7f0717, 0.9).setDepth(88)
      this.scene.tweens.add({
        targets: droplet,
        x: at.x + Math.cos(angle) * distance,
        y: at.y - Math.sin(angle) * distance + Phaser.Math.Between(8, 18),
        scale: 0.35,
        alpha: 0,
        duration: Phaser.Math.Between(260, 480),
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      })
    }
    this.playDeathRemnant(at, false)
  }

  playDroneCrash(at: { x: number; y: number }) {
    const flash = this.scene.add.circle(at.x, at.y, 5, 0xffd27a, 1).setDepth(90)
    this.scene.tweens.add({ targets: flash, radius: 19, alpha: 0, duration: 190, onComplete: () => flash.destroy() })
    for (let i = 0; i < 14; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const distance = Phaser.Math.Between(18, 48)
      const spark = this.scene.add.rectangle(at.x, at.y, Phaser.Math.Between(5, 10), 2, i % 3 === 0 ? 0x8cefff : 0xffa33c, 1)
        .setRotation(angle).setDepth(91)
      this.scene.tweens.add({
        targets: spark,
        x: at.x + Math.cos(angle) * distance,
        y: at.y + Math.sin(angle) * distance + Phaser.Math.Between(4, 15),
        alpha: 0,
        scaleX: 0.25,
        duration: Phaser.Math.Between(260, 520),
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      })
    }
    for (let i = 0; i < 4; i += 1) {
      const smoke = this.scene.add.circle(at.x + Phaser.Math.Between(-8, 8), at.y, Phaser.Math.Between(5, 9), 0x263039, 0.55).setDepth(89)
      this.scene.tweens.add({
        targets: smoke,
        x: smoke.x + Phaser.Math.Between(-10, 10),
        y: smoke.y - Phaser.Math.Between(18, 38),
        radius: smoke.radius * 1.8,
        alpha: 0,
        duration: Phaser.Math.Between(650, 1050),
        onComplete: () => smoke.destroy(),
      })
    }
    this.playDeathRemnant(at, true)
  }

  playDeathRemnant(at: { x: number; y: number }, mechanical: boolean, large = false) {`, 'realistic death fx')
  return s
})

edit('src/entities/MercenaryActor.ts', s => once(s,
`    this.units.forEach((img, i) => {
      const down = Boolean(downFlags[i])
      if (down && !this.wasDown[i]) onDeath?.({ x: this.x + img.x, y: this.y + img.y + 7 })
      img.setAlpha(down ? 0.25 : 1)
      this.wasDown[i] = down
    })`,
`    this.units.forEach((img, i) => {
      const down = Boolean(downFlags[i])
      if (down && !this.wasDown[i]) {
        onDeath?.({ x: this.x + img.x, y: this.y + img.y + 7 })
        this.scene.tweens.killTweensOf(img)
        this.scene.tweens.add({
          targets: img,
          rotation: i % 2 === 0 ? -1.28 : 1.28,
          y: 9,
          alpha: 0.12,
          duration: 260,
          ease: 'Quad.easeIn',
        })
      } else if (!down && this.wasDown[i]) {
        this.scene.tweens.killTweensOf(img)
        img.setPosition(this.homeX[i], 0).setRotation(0).setAlpha(1)
      }
      this.wasDown[i] = down
    })`, 'merc collapse'))

edit('src/entities/DroneSquadActor.ts', s => once(s,
`  playDeath(index: number, onDeath: (at: { x: number; y: number }) => void) {
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
  }`,
`  playDeath(index: number, onDeath: (at: { x: number; y: number }) => void) {
    const slot = Math.abs(index) % this.drones.length
    const drone = this.drones[slot]
    if (!drone) return
    this.busy[slot] = true
    this.scene.tweens.killTweensOf(drone)
    const crashX = drone.x + Phaser.Math.Between(-24, 24)
    const crashY = drone.y + Phaser.Math.Between(32, 52)
    this.scene.tweens.add({
      targets: drone,
      x: crashX,
      y: crashY,
      rotation: drone.rotation + Phaser.Math.FloatBetween(4.5, 7.5),
      alpha: 0.18,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => {
        onDeath({ x: this.x + crashX, y: this.y + crashY })
        drone.setVisible(false)
        this.scene.time.delayedCall(5000, () => {
          if (!drone.active) return
          const home = this.orbitPositions[slot]
          drone.setPosition(home.x, home.y).setRotation(0).setAlpha(1).setVisible(true)
          this.busy[slot] = false
        })
      },
    })
  }`, 'drone crash animation'))

edit('src/scenes/BattleScene.ts', s => once(s, `      this.effects.playDeathRemnant(at, false)`, `      this.effects.playMercenaryDeath(at)`, 'merc realistic death'))
