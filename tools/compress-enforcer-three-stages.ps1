$utf8 = New-Object System.Text.UTF8Encoding($false)

$bossPath = (Resolve-Path 'src/data/bosses.ts').Path
$boss = [System.IO.File]::ReadAllText($bossPath)
$boss = [regex]::Replace($boss, 'export type BossStage =[^\r\n]+', 'export type BossStage = 1 | 2 | 3')
$boss = [regex]::Replace($boss, "(?m)^\s*\| 'missile-salvo'\r?\n", '')
$bossPattern = "(?s)    trait: '[^']*',\r?\n    stages: \[.*?    \],\r?\n  \},\r?\n  eve:"
$bossReplacement = @"
    trait: '三种战斗形态依次切换：堡垒镇压负责正面防御，攻城超载合并导弹火力与赤红推进，核心暴露进入最终决战。',
    stages: [
      { stage: 1, name: '堡垒镇压', hpThreshold: 1, enterCondition: '初始形态；重型封闭装甲与胸前六边形能量盾保持完整，生命高于70%', armor: 0.36, speed: 9.5, attack: 85, energyResistance: 0.12, railVulnerability: 0, ability: 'shield-wave', abilityName: '镇压冲击', abilityCooldown: 8, abilityDescription: '释放近距离装甲冲击，使附近防御塔的下一次攻击延迟0.8秒。' },
      { stage: 2, name: '攻城超载', hpThreshold: 0.7, enterCondition: '盾牌被摧毁、任一部件失效，或生命降至70%；双肩导弹舱与手臂重武器展开，全身进入赤红能量过载并启动推进冲锋', armor: 0.17, speed: 13.2, attack: 135, energyResistance: 0.01, railVulnerability: 0.14, ability: 'overdrive-salvo', abilityName: '赤红攻城弹幕', abilityCooldown: 5.8, abilityDescription: '导弹与手臂重武器同时压制三座防御塔，并借助推进器进入高速突进。' },
      { stage: 3, name: '核心暴露', hpThreshold: 0.22, enterCondition: '全部部件被摧毁，或生命降至22%；大面积装甲破损，胸口反应堆完全暴露', armor: 0.04, speed: 11, attack: 165, energyResistance: -0.15, railVulnerability: 0.3, ability: 'core-burst', abilityName: '核心爆震', abilityCooldown: 4.5, abilityDescription: '核心周期性爆震，短暂扰乱全部防御塔；自身承受更多能量与磁轨伤害。' },
    ],
  },
  eve:
"@
$updatedBoss = [regex]::Replace($boss, $bossPattern, $bossReplacement, 1)
if ($updatedBoss -eq $boss) { throw '未找到亚当·重锤阶段配置块' }
[System.IO.File]::WriteAllText($bossPath, $updatedBoss, $utf8)

$battlePath = (Resolve-Path 'src/scenes/BattleScene.ts').Path
$battle = [System.IO.File]::ReadAllText($battlePath)
$battle = [regex]::Replace($battle, "(?m)    \} else if \(ability === 'missile-salvo'\) \{\r?\n      delayTowers\(nearestTowers\(2\), 1\.6, 0xff5a45\)\r?\n", '')
[System.IO.File]::WriteAllText($battlePath, $battle, $utf8)

$testPath = (Resolve-Path 'tests/boss-behaviors.test.ts').Path
$test = [System.IO.File]::ReadAllText($testPath)
$testPattern = "(?s)test\('亚当·重锤可由生命阈值或部件摧毁进入(?:四|三)个阶段', \(\) => \{.*?\r?\n\}\)\r?\n\r?\ntest\('亚当·重锤生命阈值"
$testReplacement = @"
test('亚当·重锤可由生命阈值或部件摧毁进入三个阶段', () => {
  const enemy = spawnBoss('enforcer')
  assert.equal(tickEnforcer(enemy, 0, 100).stageName, '堡垒镇压')

  enemy.components.find((component) => component.name === '盾牌')!.hp = 0
  let result = tickEnforcer(enemy, 0, 200)
  assert.equal(enemy.stage, 2)
  assert.equal(result.stageChanged, true)
  assert.equal(result.voiceEvent, 'enraged')
  assert.equal(enemy.armor, bossStageDefinition('enforcer', 2).armor)

  enemy.components.find((component) => component.name === '导弹舱')!.hp = 0
  result = tickEnforcer(enemy, 0, 400)
  assert.equal(enemy.stage, 2)
  assert.equal(enemy.attack, bossStageDefinition('enforcer', 2).attack * 0.62)

  enemy.components.find((component) => component.name === '推进器')!.hp = 0
  result = tickEnforcer(enemy, 0, 600)
  assert.equal(enemy.stage, 3)
  assert.equal(result.voiceEvent, 'core')
  assert.ok(enemy.energyResistance < 0)
  assert.ok(enemy.railVulnerability >= 0.3)
})

test('亚当·重锤生命阈值
"@
$updatedTest = [regex]::Replace($test, $testPattern, $testReplacement, 1)
if ($updatedTest -eq $test) { throw '未找到Boss阶段测试块' }
[System.IO.File]::WriteAllText($testPath, $updatedTest, $utf8)

Write-Output '亚当·重锤已压缩为三阶段。'
