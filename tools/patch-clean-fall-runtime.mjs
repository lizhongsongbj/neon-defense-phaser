import fs from 'node:fs'
const p='src/entities/EnemyActor.ts'; let s=fs.readFileSync(p,'utf8')
s=s.replace("function textureKeyFor(state: EnemyState): string {", "const CLEAN_FALL_DEATH_IDS = new Set(['aerostat', 'devourer', 'faraday', 'hijacker'])\n\nfunction textureKeyFor(state: EnemyState): string {")
const old=`    const motion: EnemyAnimationMotion = leaked && this.hasMotion('attack') ? 'attack' : 'death'
    if (!this.hasMotion(motion)) {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleX: this.sprite.scaleX * (leaked ? 1.08 : 0.82),
        scaleY: this.sprite.scaleY * (leaked ? 1.08 : 0.82),
        duration: leaked ? 260 : 420,
        onComplete,
      })
      return
    }
`
const neu=`    if (!leaked && !this.enemy.isBoss && CLEAN_FALL_DEATH_IDS.has(this.enemy.typeId)) {
      // 四种新增单位使用干净整图作为底帧，倒下动作由 Phaser 做整体旋转、下坠和淡出，避免彩色扫描线。
      this.scene.tweens.add({
        targets: this.sprite,
        angle: { from: 0, to: this.enemy.air ? 62 : 78 },
        y: { from: 0, to: this.baseSize * 0.22 },
        scaleY: { from: 1, to: 0.72 },
        alpha: { from: 1, to: 0 },
        duration: 560,
        ease: 'Cubic.easeIn',
        onComplete,
      })
      return
    }

    const motion: EnemyAnimationMotion = leaked && this.hasMotion('attack') ? 'attack' : 'death'
    if (!this.hasMotion(motion)) {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleX: this.sprite.scaleX * (leaked ? 1.08 : 0.82),
        scaleY: this.sprite.scaleY * (leaked ? 1.08 : 0.82),
        duration: leaked ? 260 : 420,
        onComplete,
      })
      return
    }
`
if(!s.includes(old)) throw new Error('exit block not found')
s=s.replace(old,neu); fs.writeFileSync(p,s,'utf8')
