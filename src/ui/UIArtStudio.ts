export type UIArtThemeId = 'night' | 'corporate' | 'street' | 'biotech'
export type UIArtPresetId = 'command' | 'battle' | 'tower' | 'alert' | 'result'

interface UIArtTheme {
  id: UIArtThemeId
  name: string
  accent: string
  secondary: string
  warning: string
  surface: string
  text: string
}

interface UIArtPreset {
  id: UIArtPresetId
  name: string
  code: string
  description: string
}

const THEMES: readonly UIArtTheme[] = [
  { id:'night', name:'夜城防线', accent:'#20f4e6', secondary:'#ff3ea5', warning:'#ffe35b', surface:'#061116', text:'#ecffff' },
  { id:'corporate', name:'企业战术', accent:'#75bfff', secondary:'#eef7ff', warning:'#ffb85c', surface:'#07101c', text:'#f4f8ff' },
  { id:'street', name:'街头佣兵', accent:'#ff5b55', secondary:'#ffd15c', warning:'#ff8b42', surface:'#16100d', text:'#fff2dc' },
  { id:'biotech', name:'生体协议', accent:'#74ff9f', secondary:'#c45cff', warning:'#ff697f', surface:'#07150f', text:'#eaffef' },
]

const PRESETS: readonly UIArtPreset[] = [
  { id:'command', name:'指挥中心', code:'CMD-01', description:'关卡选择、战区情报、难度与部署入口。' },
  { id:'battle', name:'战斗 HUD', code:'HUD-02', description:'资源、波次、基地生命与战术指令。' },
  { id:'tower', name:'防御塔卡片', code:'TWR-03', description:'塔楼名称、等级、价格、属性与建造状态。' },
  { id:'alert', name:'战术警报', code:'ALT-04', description:'Boss出现、基地受损与连携就绪提示。' },
  { id:'result', name:'战斗结算', code:'RSL-05', description:'胜负结果、奖励、评分与下一步操作。' },
]

const escapeHtml = (value:string) => value.replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char] ?? char))

export class UIArtStudio {
  private readonly root = document.getElementById('ui-art-studio') as HTMLElement
  private readonly preview = document.getElementById('ui-art-preview') as HTMLElement
  private readonly presetButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ui-preset]'))
  private readonly themeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ui-theme]'))
  private readonly accentInput = document.getElementById('ui-art-accent') as HTMLInputElement
  private readonly densityInput = document.getElementById('ui-art-density') as HTMLInputElement
  private readonly cornersInput = document.getElementById('ui-art-corners') as HTMLSelectElement
  private readonly gridInput = document.getElementById('ui-art-grid') as HTMLInputElement
  private readonly scanlineInput = document.getElementById('ui-art-scanlines') as HTMLInputElement
  private readonly status = document.getElementById('ui-art-status') as HTMLOutputElement
  private readonly title = document.getElementById('ui-art-preview-title') as HTMLElement
  private readonly meta = document.getElementById('ui-art-preview-meta') as HTMLElement
  private activePreset: UIArtPresetId = 'command'
  private activeTheme: UIArtThemeId = 'night'
  private initialized = false

  constructor() {
    if (!this.root) return
    this.presetButtons.forEach((button) => button.addEventListener('click', () => {
      this.activePreset = button.dataset.uiPreset as UIArtPresetId
      this.render()
    }))
    this.themeButtons.forEach((button) => button.addEventListener('click', () => {
      const theme = THEMES.find((item) => item.id === button.dataset.uiTheme)
      if (!theme) return
      this.activeTheme = theme.id
      this.accentInput.value = theme.accent
      this.render()
    }))
    ;[this.accentInput, this.densityInput, this.cornersInput, this.gridInput, this.scanlineInput]
      .forEach((control) => control.addEventListener('input', () => this.render()))
    document.getElementById('ui-art-randomize')?.addEventListener('click', () => this.randomize())
    document.getElementById('ui-art-copy')?.addEventListener('click', () => void this.copyTokens())
    document.getElementById('ui-art-export')?.addEventListener('click', () => this.exportTokens())
    document.getElementById('ui-art-reset')?.addEventListener('click', () => this.reset())
  }

  activate() {
    if (!this.root) return
    if (!this.initialized) {
      this.initialized = true
      this.render()
    }
  }

  private theme() {
    return THEMES.find((item) => item.id === this.activeTheme) ?? THEMES[0]
  }

  private preset() {
    return PRESETS.find((item) => item.id === this.activePreset) ?? PRESETS[0]
  }

  private tokens() {
    const theme = this.theme()
    const radius = this.cornersInput.value === 'sharp' ? 0 : this.cornersInput.value === 'soft' ? 16 : 6
    return {
      theme: theme.id,
      preset: this.activePreset,
      accent: this.accentInput.value,
      secondary: theme.secondary,
      warning: theme.warning,
      surface: theme.surface,
      text: theme.text,
      density: Number(this.densityInput.value),
      radius,
      grid: this.gridInput.checked,
      scanlines: this.scanlineInput.checked,
    }
  }

  private render() {
    const theme = this.theme()
    const preset = this.preset()
    const tokens = this.tokens()
    this.root.dataset.theme = theme.id
    this.preview.dataset.preset = preset.id
    this.preview.classList.toggle('has-grid', tokens.grid)
    this.preview.classList.toggle('has-scanlines', tokens.scanlines)
    this.preview.style.setProperty('--ui-art-accent', tokens.accent)
    this.preview.style.setProperty('--ui-art-secondary', tokens.secondary)
    this.preview.style.setProperty('--ui-art-warning', tokens.warning)
    this.preview.style.setProperty('--ui-art-surface', tokens.surface)
    this.preview.style.setProperty('--ui-art-text', tokens.text)
    this.preview.style.setProperty('--ui-art-density', String(tokens.density / 100))
    this.preview.style.setProperty('--ui-art-radius', `${tokens.radius}px`)
    this.title.textContent = preset.name
    this.meta.textContent = `${preset.code} // ${theme.name} // 密度 ${tokens.density}%`
    this.preview.innerHTML = this.previewMarkup(preset.id)
    this.presetButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.uiPreset === preset.id)))
    this.themeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.uiTheme === theme.id)))
    this.status.textContent = `${preset.name}已应用 · ${theme.name} · ${tokens.accent.toUpperCase()}`
    this.status.dataset.state = 'ready'
  }

  private previewMarkup(preset: UIArtPresetId) {
    const sharedTop = `<header class="ui-mock-topbar"><b><i>//</i> NEON DEFENSE</b><span>NODE 04</span><em>ONLINE</em></header>`
    if (preset === 'battle') return `${sharedTop}<div class="ui-mock-battle"><aside><button>磁轨</button><button>电弧</button><button>兵营</button><button>黑客</button></aside><main><div class="ui-mock-map"><span class="ui-route route-a"></span><span class="ui-route route-b"></span><i class="ui-node node-a"></i><i class="ui-node node-b"></i><i class="ui-node node-c"></i></div><div class="ui-wave"><b>WAVE 08 / 12</b><span>下一波 00:18</span><button>提前开波 +42</button></div></main><section class="ui-mock-hud"><article><small>基地完整度</small><strong>82%</strong></article><article><small>可用欧元</small><strong>¥ 680</strong></article><article><small>连携状态</small><strong>READY</strong></article></section></div>`
    if (preset === 'tower') return `${sharedTop}<div class="ui-tower-showcase"><article class="ui-tower-hero"><div class="ui-tower-silhouette"><i></i><i></i><i></i></div><span>LV.4-A / RAIL</span><h3>天穹裁决者</h3><p>超远程制空 · 双目标贯穿</p><dl><div><dt>伤害</dt><dd>255</dd></div><div><dt>射程</dt><dd>300</dd></div><div><dt>冷却</dt><dd>1.55s</dd></div></dl><button>部署 ¥230</button></article><div class="ui-stat-bars"><label>火力<i style="--value:88%"></i></label><label>射程<i style="--value:96%"></i></label><label>控制<i style="--value:38%"></i></label><label>连携<i style="--value:72%"></i></label></div></div>`
    if (preset === 'alert') return `${sharedTop}<div class="ui-alert-stage"><div class="ui-alert-radar"><i></i><i></i><b>!</b></div><section><span>PRIORITY ALERT // 04</span><h3>重型敌军进入战区</h3><p>检测到骨铠破障兽。建议部署电弧塔或启用能量抗性削弱。</p><div><button>定位目标</button><button>关闭警报</button></div></section></div>`
    if (preset === 'result') return `${sharedTop}<div class="ui-result-stage"><span>MISSION COMPLETE</span><h3>节点守卫成功</h3><div class="ui-result-grade">S</div><div class="ui-result-stats"><article><small>剩余完整度</small><b>82%</b></article><article><small>消灭敌军</small><b>146</b></article><article><small>连携次数</small><b>09</b></article></div><footer><button>返回指挥中心</button><button>继续推进</button></footer></div>`
    return `${sharedTop}<div class="ui-command-layout"><aside><span>战区节点</span><button class="active">01 H4·霓虹巨构</button><button>02 荒坂物流环</button><button>03 太平洲裂谷</button><button>04 城北黑区</button></aside><main><div class="ui-command-visual"><i></i><b>THREAT 1.40</b></div><span>MISSION // 01</span><h3>H4·霓虹巨构</h3><p>守住双向数据节点，阻止帮派义体兵和防暴镇压机进入核心区。</p><div class="ui-command-chips"><i>12 波</i><i>5 塔位</i><i>标准难度</i></div><button>DEPLOY // 进入战区</button></main></div>`
  }

  private randomize() {
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)]
    const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)]
    this.activeTheme = theme.id
    this.activePreset = preset.id
    this.accentInput.value = theme.accent
    this.densityInput.value = String(76 + Math.floor(Math.random() * 25))
    this.render()
  }

  private reset() {
    this.activeTheme = 'night'
    this.activePreset = 'command'
    this.accentInput.value = THEMES[0].accent
    this.densityInput.value = '88'
    this.cornersInput.value = 'tech'
    this.gridInput.checked = true
    this.scanlineInput.checked = true
    this.render()
  }

  private async copyTokens() {
    const tokens = this.tokens()
    const css = `:root {\n  --ui-accent: ${tokens.accent};\n  --ui-secondary: ${tokens.secondary};\n  --ui-warning: ${tokens.warning};\n  --ui-surface: ${tokens.surface};\n  --ui-radius: ${tokens.radius}px;\n}`
    try {
      await navigator.clipboard.writeText(css)
      this.status.textContent = 'CSS变量已复制到剪贴板。'
      this.status.dataset.state = 'success'
    } catch {
      this.status.textContent = '无法访问剪贴板，请使用“导出规范”。'
      this.status.dataset.state = 'warning'
    }
  }

  private exportTokens() {
    const payload = {
      project: 'Neon Defense UI Art Kit',
      exportedAt: new Date().toISOString(),
      preset: this.preset(),
      tokens: this.tokens(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `neon-defense-ui-${this.activePreset}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    this.status.textContent = 'UI设计规范已导出。'
    this.status.dataset.state = 'success'
  }
}
