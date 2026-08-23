/**
 * 指挥中心「数值测试」面板 —— 原样迁移自 霓虹防线/balance-agent-ui.js。
 * 这是给开发者/策划用的内部工具,不是玩家可见内容,但用户要求必须保留。
 * 表单读取 → 调 runSuite → 渲染场景矩阵/塔楼战术贡献/诊断结论 → 导出 JSON 报告,
 * 字段与交互都对齐原版,只是数据源换成了本项目的 `BalanceSimulator`。
 */

import { MAP_LEVELS, CAMPAIGN_WAVE_COUNTS } from '../data/maps'
import { towerGrowthBonuses, type Difficulty } from '../data/balance'
import { TOWER_IDS, TOWER_TYPE_BY_ID } from '../data/towers'
import { runSuite, type ScenarioAggregate, type SuiteReport, type DiagnosisFinding } from '../systems/BalanceSimulator'
import { STRATEGIES, type GrowthBonusMap, type Strategy } from '../systems/AutoPilot'
import { CampaignState } from '../state/CampaignState'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '简单', normal: '普通', hard: '困难' }
const SEVERITY_COLOR: Record<DiagnosisFinding['severity'], string> = {
  ok: '#79ff9e',
  warning: '#ffd23f',
  critical: '#ff3ea5',
}
const CLEAR_RATE_TARGET: Record<Difficulty, [number, number]> = {
  easy: [0.65, 0.99],
  normal: [0.4, 0.79],
  hard: [0.1, 0.49],
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function average(scenarios: ScenarioAggregate[], key: 'clearRate' | 'averageHealth' | 'averageLeaks'): number {
  return scenarios.reduce((sum, s) => sum + s[key], 0) / Math.max(1, scenarios.length)
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch] as string)
}

function scenarioState(scenario: ScenarioAggregate): 'ok' | 'warning' | 'critical' {
  const [low, high] = CLEAR_RATE_TARGET[scenario.difficulty]
  if (scenario.clearRate < low * 0.55) return 'critical'
  if (scenario.clearRate < low || scenario.clearRate > high) return 'warning'
  return 'ok'
}

/**
 * 指挥中心「数值测试」面板,对应原版 #balance-controls / #balance-results。
 * 内部开发者工具,复用本项目的无头模拟器(BalanceSimulator)驱动真实战斗逻辑。
 */
export class BalancePanel {
  private readonly form: HTMLFormElement
  private readonly mapSelect: HTMLSelectElement
  private readonly difficultySelect: HTMLSelectElement
  private readonly strategySelect: HTMLSelectElement
  private readonly wavesInput: HTMLInputElement
  private readonly runsSelect: HTMLSelectElement
  private readonly runButton: HTMLButtonElement
  private readonly statusEl: HTMLOutputElement
  private readonly progressEl: HTMLElement
  private readonly resultsEl: HTMLElement

  private lastReport: SuiteReport | null = null
  private running = false

  constructor(private readonly campaign: CampaignState, private readonly getSelectedMapIndex: () => number) {
    this.form = document.getElementById('balance-controls') as HTMLFormElement
    this.mapSelect = document.getElementById('balance-map') as HTMLSelectElement
    this.difficultySelect = document.getElementById('balance-difficulty') as HTMLSelectElement
    this.strategySelect = document.getElementById('balance-strategy') as HTMLSelectElement
    this.wavesInput = document.getElementById('balance-waves') as HTMLInputElement
    this.runsSelect = document.getElementById('balance-runs') as HTMLSelectElement
    this.runButton = document.getElementById('balance-run') as HTMLButtonElement
    this.statusEl = document.getElementById('balance-status') as HTMLOutputElement
    this.progressEl = document.getElementById('balance-progress') as HTMLElement
    this.resultsEl = document.getElementById('balance-results') as HTMLElement

    this.form.addEventListener('submit', (event) => {
      event.preventDefault()
      void this.run()
    })
  }

  /** 每次切到「数值测试」tab 时刷新地图下拉,与原版 `data-command-tab="balance"` 点击行为一致 */
  onTabActivated() {
    this.populateMapOptions()
  }

  private populateMapOptions() {
    const currentIndex = this.getSelectedMapIndex()
    this.mapSelect.replaceChildren()

    const currentOpt = document.createElement('option')
    currentOpt.value = 'current'
    currentOpt.textContent = `当前关卡 · ${MAP_LEVELS[currentIndex].name}`
    this.mapSelect.append(currentOpt)

    const allOpt = document.createElement('option')
    allOpt.value = 'all'
    allOpt.textContent = '全部关卡'
    this.mapSelect.append(allOpt)

    MAP_LEVELS.forEach((map, index) => {
      const opt = document.createElement('option')
      opt.value = String(index)
      opt.textContent = `${String(index + 1).padStart(2, '0')} · ${map.name}`
      this.mapSelect.append(opt)
    })
  }

  private growthBonuses(): GrowthBonusMap {
    return Object.fromEntries(
      TOWER_IDS.map((id) => [id, towerGrowthBonuses(this.campaign.towerGrowthBonus(id))]),
    ) as unknown as GrowthBonusMap
  }

  private readOptions() {
    const mapValue = this.mapSelect.value
    const mapIndexes =
      mapValue === 'all' ? MAP_LEVELS.map((_, i) => i) : [mapValue === 'current' ? this.getSelectedMapIndex() : Number(mapValue)]
    const difficulties: Difficulty[] =
      this.difficultySelect.value === 'all' ? ['easy', 'normal', 'hard'] : [this.difficultySelect.value as Difficulty]
    const strategy = (STRATEGIES as string[]).includes(this.strategySelect.value) ? (this.strategySelect.value as Strategy) : 'adaptive'
    return {
      mapIndexes,
      difficulties,
      strategy,
      waves: Math.max(1, Math.min(30, Math.round(Number(this.wavesInput.value) || 10))),
      waveCounts: mapValue === 'all' ? CAMPAIGN_WAVE_COUNTS : null,
      runs: Math.max(1, Math.min(200, Math.round(Number(this.runsSelect.value) || 30))),
      seed: 'neon-defense-player-agent-v1',
      growthBonuses: this.growthBonuses(),
    }
  }

  private async run() {
    if (this.running) return
    this.running = true
    this.runButton.disabled = true
    this.statusEl.textContent = 'RUNNING // 代理计算中'
    this.progressEl.style.setProperty('--progress', '0%')
    const startedAt = Date.now()
    try {
      const options = this.readOptions()
      const report = await runSuite(options, {
        onProgress: ({ completed, total, scenario }) => {
          this.progressEl.style.setProperty('--progress', `${(completed / total) * 100}%`)
          this.statusEl.textContent = `RUNNING ${completed}/${total} // ${scenario.mapName}`
        },
      })
      this.lastReport = report
      this.render(report)
      this.statusEl.textContent = `COMPLETE // ${report.scenarios.length} 场景 · ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
    } catch (err) {
      console.error('Balance agent failed.', err)
      this.statusEl.textContent = 'ERROR // 测试失败'
      this.resultsEl.innerHTML = `<div class="balance-empty">ERROR // ${escapeHtml(err instanceof Error ? err.message : String(err))}</div>`
    } finally {
      this.running = false
      this.runButton.disabled = false
    }
  }

  private render(report: SuiteReport) {
    const avgClearRate = average(report.scenarios, 'clearRate')
    const avgHealth = average(report.scenarios, 'averageHealth')
    const avgLeaks = average(report.scenarios, 'averageLeaks')

    const towerImpact = TOWER_IDS.map((id) => {
      const def = TOWER_TYPE_BY_ID[id]
      const share = report.towerShares[id] || 0
      return `
        <div class="impact-row">
          <span>${escapeHtml(def.name)}</span>
          <span class="impact-track"><i style="--impact:${Math.max(1, share * 100)}%;--impact-color:${def.accent}"></i></span>
          <b>${pct(share)}</b>
        </div>`
    }).join('')

    const rows = report.scenarios
      .map((scenario) => {
        return `
      <tr data-state="${scenarioState(scenario)}">
        <td>${escapeHtml(scenario.mapName)}</td>
        <td>${DIFFICULTY_LABEL[scenario.difficulty]}</td>
        <td><b>${pct(scenario.clearRate)}</b></td>
        <td>${scenario.averageHealth.toFixed(1)}</td>
        <td>${scenario.averageLeaks.toFixed(1)}</td>
        <td>${scenario.averageCoins.toFixed(0)} G</td>
        <td>${scenario.p90WaveDuration.toFixed(1)}s</td>
      </tr>`
      })
      .join('')

    const findings = report.findings
      .map(
        (finding) =>
          `<div class="balance-finding" style="--finding-color:${SEVERITY_COLOR[finding.severity] ?? SEVERITY_COLOR.warning}">${escapeHtml(finding.text)}</div>`,
      )
      .join('')

    const scoreAccent = report.score >= 85 ? '#79ff9e' : report.score >= 65 ? '#ffd23f' : '#ff3ea5'

    this.resultsEl.innerHTML = `
      <section class="balance-summary" aria-label="测试摘要">
        <div class="balance-score" style="--metric-accent:${scoreAccent}">
          <span>BALANCE SCORE</span><strong>${report.score}<em>${report.verdict}</em></strong>
        </div>
        <div class="balance-metric"><span>平均通关率</span><strong>${pct(avgClearRate)}</strong></div>
        <div class="balance-metric" style="--metric-accent:#ff3ea5"><span>平均剩余血量</span><strong>${avgHealth.toFixed(1)} / 10</strong></div>
        <div class="balance-metric" style="--metric-accent:#ffd23f"><span>平均漏怪</span><strong>${avgLeaks.toFixed(1)}</strong></div>
      </section>
      <div class="balance-grid">
        <section class="balance-block">
          <h3>场景矩阵</h3>
          <div class="balance-table-wrap">
            <table class="balance-table">
              <thead><tr><th>关卡</th><th>难度</th><th>通关率</th><th>血量</th><th>漏怪</th><th>金币</th><th>P90波长</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
        <div class="balance-results-side">
          <section class="balance-block">
            <h3>塔楼战术贡献</h3>
            <div class="tower-impact">${towerImpact}</div>
          </section>
          <section class="balance-block">
            <h3>诊断</h3>
            <div class="balance-findings">${findings}</div>
          </section>
        </div>
      </div>
      <div class="balance-actions"><button class="balance-export" id="balance-export" type="button">导出 JSON 报告</button></div>
    `

    document.querySelector('#balance-export')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(this.lastReport, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `neon-defense-balance-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  }
}
