import Phaser from 'phaser'
interface EnemyRemnantGroup {
  remnant: Phaser.GameObjects.Image
  companions: Phaser.GameObjects.Shape[]
  expiry?: Phaser.Time.TimerEvent
}


const EFFECT_COLORS: Record<string, number> = {
  rail: 0x34c9ff,
  arc: 0x20f4e6,
  mercenary: 0xc99245,
  hacker: 0x79ff9e,
  drone: 0xe8ffff,
  gravity: 0xa978ff,
  'grey-tide': 0x74e69a,
  trajectory: 0x58cfff,
}

/**
 * 鏀诲嚮鐗规晥灞?鈥斺€?鍘熺増瀵瑰簲 `.combat-projectile` / `.combat-impact` / `.combat-flash` 鍏冪礌,
 * 濉旀ゼ鏈綋鍙负纾佽建銆佺數寮у拰榛戝鏀诲嚮鎻愪緵鍙戝皠鐐癸紱浣ｅ叺涓庢棤浜烘満鐢卞悇鑷崟浣嶆紨鍛樿礋璐ｅ嚭鍔ㄣ€?
 */
export class EffectsLayer {
  private readonly scene: Phaser.Scene
  private readonly remnants: Phaser.GameObjects.Image[] = []
  private readonly enemyRemnants: EnemyRemnantGroup[] = []
  private static readonly MAX_ENEMY_REMNANTS = 40
  private static readonly ENEMY_REMNANT_HOLD_MS = 42000
  private static readonly ENEMY_REMNANT_FADE_MS = 3000

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  playShot(from: { x: number; y: number }, to: { x: number; y: number }, effect: string) {
    if (effect === 'arc') {
      this.playArcDischarge(from, to)
    } else if (effect === 'rail') {
      this.playRailLaser(from, to)
    } else if (effect === 'mercenary') {
      this.playBallisticTracer(from, to)
    } else if (effect === 'gravity' || effect === 'grey-tide' || effect === 'trajectory') {
      this.playExpansionAttack(from, to, effect)
    } else {
      this.playIndustrialTracer(from, to, EFFECT_COLORS[effect] ?? 0xffffff)
    }
    this.playImpact(to, effect)
  }

  private playExpansionAttack(from: { x: number; y: number }, to: { x: number; y: number }, effect: 'gravity' | 'grey-tide' | 'trajectory') {
    const color = EFFECT_COLORS[effect]
    const hot = effect === 'gravity' ? 0xf1d8ff : effect === 'grey-tide' ? 0xc9ffda : 0xe5fbff
    const orbit = this.scene.add.container(from.x, from.y).setDepth(91).setBlendMode(Phaser.BlendModes.ADD)
    const particleCount = effect === 'grey-tide' ? 22 : 17
    for (let index = 0; index < particleCount; index += 1) {
      const angle = (index / particleCount) * Math.PI * 2
      const radius = 8 + (index % 5) * 3.4
      const particle = effect === 'grey-tide'
        ? this.scene.add.rectangle(Math.cos(angle) * radius, Math.sin(angle) * radius * .56, index % 4 === 0 ? 3.5 : 2, index % 4 === 0 ? 1.4 : 2, index % 5 === 0 ? hot : color, .9)
        : this.scene.add.circle(Math.cos(angle) * radius, Math.sin(angle) * radius * .56, index % 5 === 0 ? 2.5 : 1.45, index % 4 === 0 ? hot : color, .9)
      orbit.add(particle)
    }
    const sourceRing = this.scene.add.ellipse(from.x, from.y, 22, 11, color, .14)
      .setStrokeStyle(2, hot, .88).setDepth(90).setBlendMode(Phaser.BlendModes.ADD)
    this.scene.tweens.add({ targets: orbit, angle: effect === 'trajectory' ? -320 : 300, scale: .36, alpha: 0, duration: effect === 'grey-tide' ? 360 : 290, ease: 'Cubic.easeIn', onComplete: () => orbit.destroy() })
    this.scene.tweens.add({ targets: sourceRing, scaleX: 2.15, scaleY: 1.65, alpha: 0, duration: 360, ease: 'Quad.easeOut', onComplete: () => sourceRing.destroy() })

    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const normalAngle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y) + Math.PI / 2
    const normal = { x: Math.cos(normalAngle), y: Math.sin(normalAngle) }
    const strandCount = effect === 'grey-tide' ? 9 : effect === 'gravity' ? 4 : 5
    for (let strand = 0; strand < strandCount; strand += 1) {
      const offset = (strand - (strandCount - 1) / 2) * (effect === 'grey-tide' ? 2.3 : 3.2)
      const points = Array.from({ length: 8 }, (_, step) => {
        const t = step / 7
        const wave = Math.sin(t * Math.PI * (effect === 'trajectory' ? 2.2 : 1.35) + strand * .8)
        const envelope = Math.sin(t * Math.PI)
        return {
          x: Phaser.Math.Linear(from.x, to.x, t) + normal.x * (offset + wave * envelope * (effect === 'gravity' ? 13 : effect === 'trajectory' ? 7 : 4)),
          y: Phaser.Math.Linear(from.y, to.y, t) + normal.y * (offset + wave * envelope * (effect === 'gravity' ? 13 : effect === 'trajectory' ? 7 : 4)),
        }
      })
      const path = this.drawPath(points, strand % 3 === 0 ? hot : color, effect === 'grey-tide' ? 1.4 : strand === 0 ? 3 : 1.7, effect === 'grey-tide' ? .72 : .8, 89)
      this.fadeAndDestroy(path, effect === 'trajectory' ? 300 : 390, strand * 15)
    }

    if (effect === 'grey-tide') {
      for (let index = 0; index < 18; index += 1) {
        const speck = this.scene.add.rectangle(from.x + Phaser.Math.Between(-10, 10), from.y + Phaser.Math.Between(-7, 7), Phaser.Math.Between(1, 3), Phaser.Math.Between(1, 3), index % 5 === 0 ? hot : color, .9).setDepth(92)
        this.scene.tweens.add({ targets: speck, x: to.x + Phaser.Math.Between(-10, 10), y: to.y + Phaser.Math.Between(-8, 8), angle: Phaser.Math.Between(-180, 180), alpha: 0, duration: Phaser.Math.Between(290, 520), delay: index * 9, ease: 'Cubic.easeIn', onComplete: () => speck.destroy() })
      }
    } else if (effect === 'trajectory') {
      const echo = this.scene.add.rectangle(from.x, from.y, distance, 2, hot, .8).setOrigin(0, .5).setRotation(Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)).setDepth(91).setBlendMode(Phaser.BlendModes.ADD)
      this.scene.tweens.add({ targets: echo, alpha: 0, scaleX: { from: 1, to: .18 }, duration: 410, ease: 'Cubic.easeIn', onComplete: () => echo.destroy() })
    }
  }

  private playGravityImpact(at: { x: number; y: number }) {
    for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
      const ring = this.scene.add.ellipse(at.x, at.y, 18 + ringIndex * 7, 8 + ringIndex * 3, 0xa978ff, .08)
        .setStrokeStyle(2.4 - ringIndex * .45, ringIndex === 0 ? 0xf6e4ff : 0xa978ff, .92).setDepth(93 - ringIndex).setBlendMode(Phaser.BlendModes.ADD)
      this.scene.tweens.add({ targets: ring, scaleX: .28, scaleY: .4, angle: ringIndex % 2 ? 35 : -28, alpha: 0, duration: 430 + ringIndex * 70, ease: 'Cubic.easeIn', onComplete: () => ring.destroy() })
    }
    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2
      const radius = Phaser.Math.Between(17, 34)
      const debris = this.scene.add.rectangle(at.x + Math.cos(angle) * radius, at.y + Math.sin(angle) * radius * .55, Phaser.Math.Between(2, 5), 1.4, index % 4 === 0 ? 0xf5e5ff : 0x9a76c8, .85).setRotation(angle).setDepth(94)
      this.scene.tweens.add({ targets: debris, x: at.x, y: at.y, angle: debris.angle + 160, alpha: 0, scale: .15, duration: Phaser.Math.Between(280, 470), ease: 'Cubic.easeIn', onComplete: () => debris.destroy() })
    }
  }

  private playGreyTideImpact(at: { x: number; y: number }) {
    const scan = this.scene.add.ellipse(at.x, at.y, 20, 9, 0x74e69a, .1).setStrokeStyle(2, 0xc9ffda, .9).setDepth(92).setBlendMode(Phaser.BlendModes.ADD)
    this.scene.tweens.add({ targets: scan, scaleX: 2.7, scaleY: 2.1, alpha: 0, duration: 560, ease: 'Quad.easeOut', onComplete: () => scan.destroy() })
    for (let index = 0; index < 18; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const plate = this.scene.add.rectangle(at.x + Phaser.Math.Between(-7, 7), at.y + Phaser.Math.Between(-5, 5), Phaser.Math.Between(3, 7), Phaser.Math.FloatBetween(1, 2.2), index % 4 === 0 ? 0xc8d4cd : 0x72877b, .88).setRotation(angle).setDepth(93)
      this.scene.tweens.add({ targets: plate, x: plate.x + Math.cos(angle) * Phaser.Math.Between(13, 31), y: plate.y + Math.sin(angle) * Phaser.Math.Between(7, 19) + Phaser.Math.Between(4, 12), angle: plate.angle + Phaser.Math.Between(-120, 120), alpha: 0, duration: Phaser.Math.Between(350, 650), ease: 'Quad.easeOut', onComplete: () => plate.destroy() })
    }
    for (let index = 0; index < 16; index += 1) {
      const nano = this.scene.add.circle(at.x + Phaser.Math.Between(-18, 18), at.y + Phaser.Math.Between(-12, 12), Phaser.Math.FloatBetween(.8, 1.8), index % 5 === 0 ? 0xe8fff0 : 0x74e69a, .9).setDepth(94).setBlendMode(Phaser.BlendModes.ADD)
      this.scene.tweens.add({ targets: nano, x: at.x + Phaser.Math.Between(-4, 4), y: at.y + Phaser.Math.Between(-4, 4), alpha: 0, duration: Phaser.Math.Between(320, 620), delay: index * 12, ease: 'Cubic.easeIn', onComplete: () => nano.destroy() })
    }
  }

  private playTrajectoryImpact(at: { x: number; y: number }) {
    for (let index = 0; index < 4; index += 1) {
      const frame = this.scene.add.rectangle(at.x, at.y, 20 + index * 8, 10 + index * 4, 0x58cfff, .04).setStrokeStyle(index === 0 ? 2 : 1, index === 0 ? 0xe7fcff : 0x58cfff, .86).setDepth(94 - index).setBlendMode(Phaser.BlendModes.ADD)
      frame.setRotation(index % 2 ? .18 : -.18)
      this.scene.tweens.add({ targets: frame, x: at.x - 9 - index * 5, scaleX: 1.5, scaleY: 1.35, alpha: 0, duration: 340 + index * 80, delay: index * 28, ease: 'Quad.easeOut', onComplete: () => frame.destroy() })
    }
    for (let index = 0; index < 10; index += 1) {
      const slash = this.scene.add.rectangle(at.x + Phaser.Math.Between(-8, 8), at.y + Phaser.Math.Between(-10, 10), Phaser.Math.Between(7, 16), 1.2, index % 3 === 0 ? 0xffffff : 0x58cfff, .92).setRotation(Phaser.Math.FloatBetween(-.3, .3)).setDepth(95).setBlendMode(Phaser.BlendModes.ADD)
      this.scene.tweens.add({ targets: slash, x: slash.x - Phaser.Math.Between(12, 30), alpha: 0, scaleX: .2, duration: Phaser.Math.Between(180, 360), delay: index * 18, onComplete: () => slash.destroy() })
    }
  }

  private fadeAndDestroy(target: Phaser.GameObjects.GameObject & { alpha: number }, duration: number, delay = 0) {
    this.scene.tweens.add({ targets: target, alpha: 0, duration, delay, onComplete: () => target.destroy() })
  }

  private drawPath(points: Array<{ x: number; y: number }>, color: number, width: number, alpha: number, depth: number) {
    const graphics = this.scene.add.graphics().setDepth(depth).setBlendMode(Phaser.BlendModes.ADD)
    graphics.lineStyle(width, color, alpha).beginPath().moveTo(points[0].x, points[0].y)
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y))
    graphics.strokePath()
    return graphics
  }

  private playRailLaser(from: { x: number; y: number }, to: { x: number; y: number }) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)
    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)

    const createLaserLayer = (height: number, color: number, alpha: number, depth: number, fadeDelay: number) => {
      const beam = this.scene.add.rectangle(from.x, from.y, distance, height, color, alpha)
        .setOrigin(0, 0.5)
        .setRotation(angle)
        .setDepth(depth)
        .setBlendMode(Phaser.BlendModes.ADD)

      this.scene.tweens.add({
        targets: beam,
        scaleY: { from: 0.72, to: 1.16 },
        alpha: { from: alpha, to: Math.min(1, alpha * 1.18) },
        duration: 70,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: beam,
        alpha: 0,
        scaleY: 0.12,
        delay: fadeDelay,
        duration: 120,
        ease: 'Sine.easeIn',
        onComplete: () => beam.destroy(),
      })
    }

    // 鍏夋潫鐢熸垚鍚庣珛鍗宠疮閫氱偖鍙ｄ笌鐩爣锛屽苟鍋滅暀鏁板抚锛涗笉鍐嶄娇鐢ㄧЩ鍔ㄥ脊涓告垨鏇冲厜娈点€?    createLaserLayer(38, 0x007fca, 0.28, 87, 390)
    createLaserLayer(18, 0x20cfff, 0.96, 88, 370)
    createLaserLayer(7, 0xf8ffff, 1, 89, 345)

    const muzzleGlow = this.scene.add.circle(from.x, from.y, 12, 0xe8ffff, 1)
      .setDepth(90)
      .setBlendMode(Phaser.BlendModes.ADD)
    this.scene.tweens.add({
      targets: muzzleGlow,
      radius: 27,
      alpha: 0,
      duration: 430,
      ease: 'Quad.easeOut',
      onComplete: () => muzzleGlow.destroy(),
    })
  }
  playArcLightning(from: { x: number; y: number }, to: { x: number; y: number }, chainIndex = 0) {
    const intensity = Phaser.Math.Clamp(1 - chainIndex * 0.12, 0.7, 1)
    this.playArcDischarge(from, to, intensity)
    const animationKey = 'fx-arc-lightning-discharge'
    if (this.scene.textures.exists('fx-arc-lightning-01')) {
      if (!this.scene.anims.exists(animationKey)) {
        this.scene.anims.create({
          key: animationKey,
          frames: Array.from({ length: 16 }, (_, index) => ({ key: `fx-arc-lightning-${String(index + 1).padStart(2, '0')}` })),
          frameRate: 24,
          repeat: 0,
        })
      }
      const discharge = this.scene.add.sprite(from.x, from.y, 'fx-arc-lightning-01')
        .setDisplaySize(106 * intensity, 106 * intensity)
        .setDepth(89)
        .setBlendMode(Phaser.BlendModes.ADD)
      discharge.play(animationKey)
      discharge.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + animationKey, () => discharge.destroy())
    }
    this.playImpact(to, 'arc')
  }

  private playArcDischarge(from: { x: number; y: number }, to: { x: number; y: number }, intensity = 1) {
    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const segments = Phaser.Math.Clamp(Math.round(distance / 13), 7, 19)
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) }
    const makeBolt = (jitterScale: number, phase: number) => Array.from({ length: segments + 1 }, (_, index) => {
      const t = index / segments
      const envelope = Math.sin(t * Math.PI)
      const noise = index === 0 || index === segments
        ? 0
        : (Phaser.Math.Between(-8, 8) + Math.sin(index * 2.4 + phase) * 3) * jitterScale * envelope
      return {
        x: Phaser.Math.Linear(from.x, to.x, t) + normal.x * noise,
        y: Phaser.Math.Linear(from.y, to.y, t) + normal.y * noise,
      }
    })

    const main = makeBolt(1, 0)
    const echo = makeBolt(.62, 1.7)
    const corona = this.drawPath(main, 0x00a6bd, 14 * intensity, .3 * intensity, 87)
    const body = this.drawPath(main, 0x24fff0, 5.5 * intensity, .98, 88)
    const core = this.drawPath(main, 0xffffff, Math.max(1.7, 2.35 * intensity), 1, 90)
    const flashCore = this.drawPath(main, 0xf7ffff, Math.max(2.1, 2.9 * intensity), .78, 91)
    const echoBody = this.drawPath(echo, 0x39d9ff, 3.2 * intensity, .68 * intensity, 88)
    const echoCore = this.drawPath(echo, 0xe6ffff, 1.35, .9 * intensity, 89)
    this.fadeAndDestroy(corona, 260)
    this.fadeAndDestroy(body, 195)
    this.fadeAndDestroy(core, 145)
    this.fadeAndDestroy(flashCore, 68)
    this.fadeAndDestroy(echoBody, 175, 18)
    this.fadeAndDestroy(echoCore, 112, 18)

    const branchCount = Math.max(3, Math.round(5 * intensity))
    for (let branch = 0; branch < branchCount; branch += 1) {
      const rootIndex = Phaser.Math.Between(2, main.length - 3)
      const root = main[rootIndex]
      const direction = branch % 2 === 0 ? 1 : -1
      const branchAngle = angle + direction * Phaser.Math.FloatBetween(.55, 1.22)
      const length = Phaser.Math.Between(14, 36) * intensity
      const fork = [
        root,
        { x: root.x + Math.cos(branchAngle) * length * .48 + Phaser.Math.Between(-3, 3), y: root.y + Math.sin(branchAngle) * length * .48 + Phaser.Math.Between(-3, 3) },
        { x: root.x + Math.cos(branchAngle) * length, y: root.y + Math.sin(branchAngle) * length },
      ]
      const branchGlow = this.drawPath(fork, 0x13d9e9, 4.5, .34 * intensity, 87)
      const branchCore = this.drawPath(fork, branch % 3 === 0 ? 0xffffff : 0x7dfff7, 1.4, .96 * intensity, 89)
      this.fadeAndDestroy(branchGlow, Phaser.Math.Between(120, 185), Phaser.Math.Between(0, 38))
      this.fadeAndDestroy(branchCore, Phaser.Math.Between(85, 145), Phaser.Math.Between(0, 38))
    }

    const sourceGlow = this.scene.add.circle(from.x, from.y, 7, 0xffffff, 1)
      .setStrokeStyle(5, 0x20f4e6, .92)
      .setDepth(90)
      .setBlendMode(Phaser.BlendModes.ADD)
    this.scene.tweens.add({
      targets: sourceGlow,
      radius: 18 + 5 * intensity,
      alpha: 0,
      duration: 230,
      ease: 'Quad.easeOut',
      onComplete: () => sourceGlow.destroy(),
    })

    for (let sparkIndex = 1; sparkIndex <= 4; sparkIndex += 1) {
      const point = main[Math.round((sparkIndex / 5) * segments)]
      const spark = this.scene.add.circle(point.x, point.y, Phaser.Math.FloatBetween(1.8, 3.2), sparkIndex % 2 ? 0xffffff : 0x32fff0, 1)
        .setDepth(91)
        .setBlendMode(Phaser.BlendModes.ADD)
      const drift = Phaser.Math.FloatBetween(-12, 12)
      this.scene.tweens.add({
        targets: spark,
        x: spark.x + normal.x * drift,
        y: spark.y + normal.y * drift,
        scale: .15,
        alpha: 0,
        duration: Phaser.Math.Between(120, 210),
        onComplete: () => spark.destroy(),
      })
    }
  }

  private playBallisticTracer(from: { x: number; y: number }, to: { x: number; y: number }) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)
    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const tracerLength = Math.min(22, distance * .28)
    const tracerFrom = { x: to.x - Math.cos(angle) * tracerLength, y: to.y - Math.sin(angle) * tracerLength }
    const glow = this.drawPath([tracerFrom, to], 0xd87432, 4, .22, 87)
    const core = this.drawPath([tracerFrom, to], 0xffd58a, 1, .95, 88)
    this.fadeAndDestroy(glow, 95)
    this.fadeAndDestroy(core, 65)
    for (let i = 0; i < 4; i += 1) {
      const sparkAngle = angle + Math.PI + Phaser.Math.FloatBetween(-.6, .6)
      const spark = this.scene.add.rectangle(from.x, from.y, Phaser.Math.Between(4, 9), 1, i === 0 ? 0xfff0bd : 0xd88a38, .9).setRotation(sparkAngle).setDepth(88)
      this.scene.tweens.add({ targets: spark, x: from.x + Math.cos(sparkAngle) * Phaser.Math.Between(8, 18), y: from.y + Math.sin(sparkAngle) * Phaser.Math.Between(8, 18), alpha: 0, duration: Phaser.Math.Between(90, 170), onComplete: () => spark.destroy() })
    }
  }

  private playIndustrialTracer(from: { x: number; y: number }, to: { x: number; y: number }, color: number) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)
    const projectile = this.scene.add.rectangle(from.x, from.y, 10, 3, color, .95).setRotation(angle).setDepth(88).setBlendMode(Phaser.BlendModes.ADD)
    this.scene.tweens.add({ targets: projectile, x: to.x, y: to.y, duration: 110, ease: 'Linear', onComplete: () => projectile.destroy() })
  }

  /** 浣跨敤鐢ㄦ埛鍦堥€夌殑涓€绾ч粦瀹腑缁ц剦鍐插簭鍒楋紱16甯т繚鎸佸師鍔ㄧ敾鐨勭敓鎴愩€佹樉鐜板拰娑堟暎鑺傚銆?*/
  playHackerPulse(from: { x: number; y: number }, to: { x: number; y: number }, level: number) {
    const animationKey = 'fx-hacker-selected-pulse-fire'
    if (!this.scene.anims.exists(animationKey)) {
      this.scene.anims.create({
        key: animationKey,
        frames: Array.from({ length: 16 }, (_, index) => ({
          key: `fx-hacker-selected-pulse-${String(index + 1).padStart(2, '0')}`,
        })),
        duration: 16 * 55,
        repeat: 0,
      })
    }

    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const displayWidth = Phaser.Math.Clamp(distance, 72, 260)
    const displayHeight = Phaser.Math.Clamp(displayWidth * (101 / 247), 28, 74)
    const rotation = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y) - Math.PI
    const pulse = this.scene.add.sprite(from.x, from.y, 'fx-hacker-selected-pulse-01')
      .setOrigin(1, 0.5)
      .setDisplaySize(displayWidth, displayHeight)
      .setRotation(rotation)
      .setAlpha(Phaser.Math.Clamp(0.88 + level * 0.03, 0.88, 1))
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(86)

    pulse.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => pulse.destroy())
    pulse.play(animationKey)
    this.scene.time.delayedCall(11 * 55, () => this.playImpact(to, 'hacker'))
  }
  playImpact(at: { x: number; y: number }, effect: string) {
    if (effect === 'gravity') {
      this.playGravityImpact(at)
      return
    }
    if (effect === 'grey-tide') {
      this.playGreyTideImpact(at)
      return
    }
    if (effect === 'trajectory') {
      this.playTrajectoryImpact(at)
      return
    }
    if (effect === 'rail') {
      const bloom = this.scene.add.circle(at.x, at.y, 9, 0xf2ffff, 1)
        .setStrokeStyle(6, 0x25d8ff, 0.96)
        .setDepth(90)
        .setBlendMode(Phaser.BlendModes.ADD)
      this.scene.tweens.add({
        targets: bloom,
        radius: 32,
        alpha: 0,
        duration: 390,
        ease: 'Quad.easeOut',
        onComplete: () => bloom.destroy(),
      })
      return
    }
    if (effect === 'arc') {
      const electricBloom = this.scene.add.circle(at.x, at.y, 7, 0xffffff, 1)
        .setStrokeStyle(5, 0x20f4e6, .96)
        .setDepth(92)
        .setBlendMode(Phaser.BlendModes.ADD)
      const electricRing = this.scene.add.ellipse(at.x, at.y, 16, 7, 0x22f7eb, .35)
        .setStrokeStyle(2, 0xbfffff, .95)
        .setDepth(91)
        .setBlendMode(Phaser.BlendModes.ADD)
      this.scene.tweens.add({ targets: electricBloom, radius: 24, alpha: 0, duration: 270, ease: 'Quad.easeOut', onComplete: () => electricBloom.destroy() })
      this.scene.tweens.add({ targets: electricRing, scaleX: 2.7, scaleY: 2.1, alpha: 0, duration: 310, ease: 'Quad.easeOut', onComplete: () => electricRing.destroy() })
    }
    const palette: Record<string, { hot: number; body: number; smoke: number }> = {
      rail: { hot: 0xf1fdff, body: 0x43d7ff, smoke: 0x33464d },
      arc: { hot: 0xe9ffff, body: 0x22e9dc, smoke: 0x294348 },
      mercenary: { hot: 0xffe3a2, body: 0xd88336, smoke: 0x4a4038 },
      hacker: { hot: 0xd8ffe3, body: 0x60e88d, smoke: 0x263e31 },
      drone: { hot: 0xfff0bd, body: 0xe39a48, smoke: 0x3a4042 },
    }
    const colors = palette[effect] ?? { hot: 0xffffff, body: EFFECT_COLORS[effect] ?? 0xffffff, smoke: 0x3b4245 }
    const fragmentCount = effect === 'rail' ? 9 : effect === 'drone' ? 11 : 7
    for (let i = 0; i < fragmentCount; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const distance = Phaser.Math.Between(8, effect === 'drone' ? 30 : 23)
      const fragment = this.scene.add.rectangle(at.x, at.y, Phaser.Math.Between(3, 8), Phaser.Math.FloatBetween(.8, 1.8), i % 4 === 0 ? colors.hot : colors.body, Phaser.Math.FloatBetween(.72, 1))
        .setRotation(angle).setDepth(90).setBlendMode(Phaser.BlendModes.ADD)
      this.scene.tweens.add({ targets: fragment, x: at.x + Math.cos(angle) * distance, y: at.y + Math.sin(angle) * distance + Phaser.Math.Between(2, 10), angle: fragment.angle + Phaser.Math.Between(-80, 80), alpha: 0, scaleX: .25, duration: Phaser.Math.Between(150, 330), ease: 'Cubic.easeOut', onComplete: () => fragment.destroy() })
    }
    const flash = this.scene.add.star(at.x, at.y, 5, 2, effect === 'rail' ? 9 : 6, colors.hot, .92).setDepth(89).setBlendMode(Phaser.BlendModes.ADD)
    this.scene.tweens.add({ targets: flash, scaleX: 2.1, scaleY: .65, alpha: 0, rotation: Phaser.Math.FloatBetween(-.5, .5), duration: 130, onComplete: () => flash.destroy() })
    if (effect === 'mercenary' || effect === 'drone' || effect === 'rail') {
      for (let i = 0; i < 3; i += 1) {
        const smoke = this.scene.add.circle(at.x + Phaser.Math.Between(-4, 4), at.y + Phaser.Math.Between(-2, 3), Phaser.Math.Between(3, 6), colors.smoke, .28).setDepth(87)
        this.scene.tweens.add({ targets: smoke, x: smoke.x + Phaser.Math.Between(-8, 8), y: smoke.y - Phaser.Math.Between(8, 18), radius: smoke.radius * 1.7, alpha: 0, duration: Phaser.Math.Between(320, 560), ease: 'Sine.easeOut', onComplete: () => smoke.destroy() })
      }
    }
  }


  playMercenaryDeath(at: { x: number; y: number }) {
    for (let i = 0; i < 9; i += 1) {
      const angle = Phaser.Math.FloatBetween(Math.PI * 0.05, Math.PI * 0.95)
      const distance = Phaser.Math.Between(9, 30)
      const droplet = this.scene.add.circle(at.x, at.y, Phaser.Math.Between(1, 3), i % 5 === 0 ? 0x29c5d2 : 0x7f0717, 0.9).setDepth(88)
      this.scene.tweens.add({
        targets: droplet,
        x: at.x + Math.cos(angle) * distance,
        y: at.y - Math.sin(angle) * distance + Phaser.Math.Between(10, 22),
        scale: 0.35,
        alpha: 0,
        duration: Phaser.Math.Between(320, 550),
        ease: 'Quad.easeOut',
        onComplete: () => droplet.destroy(),
      })
    }
    // 琛€婊翠粛鍦ㄧ┖涓椂琛€杩瑰紑濮嬫贰鍏ワ紝閬垮厤浣ｅ叺銆佽婊村拰娈嬬暀涔嬮棿鍑虹幇鐢熺‖鍒囨崲銆?
    this.scene.time.delayedCall(230, () => this.playDeathRemnant(at, false, false, 340))
  }

  /** 涓夋鏃犵紳鍧犳瘉锛氫笅鍧犵敱 DroneSquadActor 瀹屾垚锛涙挒鍦板悓甯у嚭鐜扮伀鑻楋紱鐏嫍缁撴潫鍚屽抚鎹负娈嬮銆?*/
  playDroneCrash(at: { x: number; y: number }) {
    if (!this.scene.textures.exists('drone-crash-flame')) {
      this.playDeathRemnant(at, true)
      return
    }
    const flame = this.scene.add.image(at.x, at.y - 8, 'drone-crash-flame')
      .setDisplaySize(42, 58)
      .setOrigin(0.5, 0.82)
      .setDepth(90)
      .setAlpha(0.96)
    this.scene.tweens.add({
      targets: flame,
      scaleX: { from: 0.82, to: 1.08 },
      scaleY: { from: 0.9, to: 1.15 },
      angle: { from: -3, to: 3 },
      duration: 120,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    })
    // 鐏嫍灏氭湭瀹屽叏鐔勭伃鏃讹紝娈嬮鎻愬墠娣″叆绾︽暟甯э紝浣夸袱鑰呰嚜鐒朵氦鍙犮€?
    this.scene.time.delayedCall(580, () => {
      this.playDeathRemnant(at, true, false, 410)
      if (!flame.active) return
      this.scene.tweens.killTweensOf(flame)
      this.scene.tweens.add({
        targets: flame,
        alpha: 0,
        scaleX: 0.88,
        scaleY: 0.78,
        duration: 500,
        ease: 'Sine.easeInOut',
        onComplete: () => flame.destroy(),
      })
    })
  }

  private createDeathRemnant(at: { x: number; y: number }, mechanical: boolean, large: boolean, alpha: number) {
    const key = mechanical ? 'remnant-mechanical' : 'remnant-biological'
    if (!this.scene.textures.exists(key)) return null
    return this.scene.add.image(at.x, at.y + 7, key)
      .setDisplaySize(large ? 92 : mechanical ? 62 : 55, large ? 70 : mechanical ? 48 : 38)
      .setRotation(Phaser.Math.FloatBetween(-0.35, 0.35))
      .setAlpha(alpha)
      .setDepth(4)
  }

  private createEnemyRemnantCompanions(at: { x: number; y: number }, mechanical: boolean, large: boolean) {
    const sizeScale = large ? 1.35 : 1
    if (mechanical) {
      return Array.from({ length: large ? 9 : 6 }, (_, index) => {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
        const distance = Phaser.Math.Between(10, large ? 42 : 30)
        const spark = this.scene.add.star(
          at.x + Math.cos(angle) * distance,
          at.y + 5 + Math.sin(angle) * distance * .45,
          4,
          1.2 * sizeScale,
          3.1 * sizeScale,
          index % 2 ? 0xffa53d : 0xffe18a,
          Phaser.Math.FloatBetween(.18, .42),
        ).setDepth(5).setBlendMode(Phaser.BlendModes.ADD)
        this.scene.tweens.add({
          targets: spark,
          alpha: { from: .12, to: Phaser.Math.FloatBetween(.48, .78) },
          x: spark.x + Phaser.Math.Between(-5, 5),
          y: spark.y - Phaser.Math.Between(2, 9),
          rotation: spark.rotation + Phaser.Math.FloatBetween(-1.1, 1.1),
          duration: Phaser.Math.Between(900, 1550),
          delay: index * 90,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
        return spark
      })
    }
    return Array.from({ length: large ? 7 : 5 }, (_, index) => {
      const mist = this.scene.add.ellipse(
        at.x + Phaser.Math.Between(-20, 20) * sizeScale,
        at.y + Phaser.Math.Between(1, 12),
        Phaser.Math.Between(14, 26) * sizeScale,
        Phaser.Math.Between(6, 12) * sizeScale,
        index % 2 ? 0x8f1028 : 0xc52a3b,
        Phaser.Math.FloatBetween(.08, .18),
      ).setDepth(5).setBlendMode(Phaser.BlendModes.ADD).setRotation(Phaser.Math.FloatBetween(-.4, .4))
      this.scene.tweens.add({
        targets: mist,
        alpha: { from: .05, to: Phaser.Math.FloatBetween(.16, .3) },
        x: mist.x + Phaser.Math.Between(-7, 7),
        y: mist.y - Phaser.Math.Between(3, 10),
        scaleX: { from: .82, to: 1.22 },
        scaleY: { from: .72, to: 1.08 },
        duration: Phaser.Math.Between(1800, 3000),
        delay: index * 150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
      return mist
    })
  }

  private destroyEnemyRemnantGroup(group: EnemyRemnantGroup) {
    group.expiry?.remove(false)
    for (const object of [group.remnant, ...group.companions]) {
      this.scene.tweens.killTweensOf(object)
      if (object.active) object.destroy()
    }
    const index = this.enemyRemnants.indexOf(group)
    if (index >= 0) this.enemyRemnants.splice(index, 1)
  }

  private fadeEnemyRemnantGroup(group: EnemyRemnantGroup) {
    if (!group.remnant.active) return
    group.expiry?.remove(false)
    const targets = [group.remnant, ...group.companions].filter((object) => object.active)
    for (const object of targets) this.scene.tweens.killTweensOf(object)
    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration: EffectsLayer.ENEMY_REMNANT_FADE_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => this.destroyEnemyRemnantGroup(group),
    })
  }

  /** Enemy remains and their blood mist/sparks persist together, then fade as one group. */
  playEnemyDeathRemnant(at: { x: number; y: number }, mechanical: boolean, large = false) {
    const targetAlpha = mechanical ? 0.92 : 0.82
    const remnant = this.createDeathRemnant(at, mechanical, large, 0)
    if (!remnant) return
    remnant
      .setName(`enemy-remnant-${mechanical ? 'mechanical' : 'biological'}`)
      .setData('remnant-kind', mechanical ? 'mechanical' : 'biological')
    const group: EnemyRemnantGroup = {
      remnant,
      companions: this.createEnemyRemnantCompanions(at, mechanical, large),
    }
    this.enemyRemnants.push(group)
    const targetScaleX = remnant.scaleX
    const targetScaleY = remnant.scaleY
    remnant.setScale(targetScaleX * 0.78, targetScaleY * 0.78)
    this.scene.tweens.add({
      targets: remnant,
      alpha: targetAlpha,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 260,
      ease: 'Sine.easeOut',
    })
    group.expiry = this.scene.time.delayedCall(EffectsLayer.ENEMY_REMNANT_HOLD_MS, () => this.fadeEnemyRemnantGroup(group))
    while (this.enemyRemnants.length > EffectsLayer.MAX_ENEMY_REMNANTS) {
      const oldest = this.enemyRemnants[0]
      if (!oldest) break
      this.destroyEnemyRemnantGroup(oldest)
    }
  }

  playDeathRemnant(at: { x: number; y: number }, mechanical: boolean, large = false, revealDuration = 0) {
    const remnant = this.createDeathRemnant(at, mechanical, large, revealDuration > 0 ? 0 : mechanical ? 0.92 : 0.82)
    if (!remnant) return
    this.remnants.push(remnant)
    while (this.remnants.length > 28) this.remnants.shift()?.destroy()
    const fadeRemnant = () => this.scene.tweens.add({
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
    if (revealDuration > 0) {
      this.scene.tweens.add({
        targets: remnant,
        alpha: mechanical ? 0.92 : 0.82,
        duration: revealDuration,
        ease: 'Sine.easeOut',
        onComplete: fadeRemnant,
      })
    } else {
      fadeRemnant()
    }
  }

  destroy() {
    for (const remnant of this.remnants) {
      this.scene.tweens.killTweensOf(remnant)
      if (remnant.active) remnant.destroy()
    }
    for (const group of [...this.enemyRemnants]) this.destroyEnemyRemnantGroup(group)
    this.remnants.length = 0
    this.enemyRemnants.length = 0
  }

  playFlash(from: { x: number; y: number }, to: { x: number; y: number }, color: number) {
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)
    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const segments = Phaser.Math.Clamp(Math.round(distance / 18), 5, 14)
    const points = Array.from({ length: segments + 1 }, (_, index) => {
      const t = index / segments
      const jitter = index === 0 || index === segments ? 0 : Phaser.Math.Between(-4, 4)
      return { x: Phaser.Math.Linear(from.x, to.x, t) - Math.sin(angle) * jitter, y: Phaser.Math.Linear(from.y, to.y, t) + Math.cos(angle) * jitter }
    })
    const corona = this.drawPath(points, color, 5, .2, 87)
    const core = this.drawPath(points, 0xf4ffff, 1, .92, 88)
    this.fadeAndDestroy(corona, 135)
    this.fadeAndDestroy(core, 85)
  }

}

