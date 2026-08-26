import fs from 'node:fs'

function write(path, source) {
  const raw = fs.readFileSync(path, 'utf8')
  const bom = raw.charCodeAt(0) === 0xfeff ? '\uFEFF' : ''
  fs.writeFileSync(path, bom + source.replace(/^\uFEFF/, ''), 'utf8')
}

{
  const path = 'src/data/bosses.ts'
  let source = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  source = source.replace(
    '  stages: readonly BossStageDefinition[]`r`n  stageImages?: Partial<Record<BossStage, string>>',
    '  stages: readonly BossStageDefinition[]\n  stageImages?: Partial<Record<BossStage, string>>',
  )
  source = source.replace('    },    trait:', '    },\n    trait:')
  if (!source.includes('stageImages?: Partial<Record<BossStage, string>>')) throw new Error('stageImages type missing')
  if (!source.includes("2: 'assets/enemies/boss-forms/adam-smasher-stage-2-siege-overload.png'")) throw new Error('stage two image missing')
  write(path, source)
}

{
  const path = 'src/scenes/PreloadScene.ts'
  let source = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  const pattern = /    for \(const boss of Object\.values\(BOSS_TYPES\)\) \{\r?\n      this\.load\.image\(`enemy-\$\{boss\.id\}`, boss\.image\)\r?\n    \}/
  if (!source.includes('Object.entries(boss.stageImages')) {
    if (!pattern.test(source)) throw new Error('boss preload loop missing')
    source = source.replace(pattern, `    for (const boss of Object.values(BOSS_TYPES)) {
      this.load.image(\`enemy-\${boss.id}\`, boss.image)
      for (const [stage, image] of Object.entries(boss.stageImages ?? {})) {
        this.load.image(bossStageTextureKey(boss.id, Number(stage)), image)
      }
    }`)
  }
  write(path, source)
}

{
  const path = 'src/entities/EnemyActor.ts'
  let source = fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  if (!source.includes('private syncBossStageVisual(): boolean')) throw new Error('stage visual sync missing')
  if (!source.includes('const usesBossStageVisual = this.syncBossStageVisual()')) throw new Error('stage visual runtime hook missing')
  if (!source.includes('if (usesBossStageVisual) this.sprite.clearTint()')) {
    source = source.replace(
      '      this.sprite.setTint(color)\n      this.statusRing.lineStyle(2, color, 0.66).strokeCircle(0, 0, this.sprite.displayWidth * 0.62)',
      '      if (usesBossStageVisual) this.sprite.clearTint()\n      else this.sprite.setTint(color)\n      this.statusRing.lineStyle(2, color, 0.66).strokeCircle(0, 0, this.sprite.displayWidth * 0.62)',
    )
  }
  write(path, source)
}

console.log('Stage visual wiring repaired.')
