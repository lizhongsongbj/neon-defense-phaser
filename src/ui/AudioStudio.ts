import { COMMANDER_VOICE_PLAYBACK_RATE, DRONE_VOICE_PLAYBACK_RATE, VOICE_PLAYBACK_RATE } from '../audio/voiceManifest'

interface AudioLibraryItem {
  id: string
  name: string
  category: 'music' | 'voice' | 'generated'
  group: string
  url: string
  fileName: string
  byteLength: number
  prompt?: string
}

interface AudioStudioConfig {
  keyConfigured: boolean
  durations: number[]
}

const CATEGORY_LABEL: Record<AudioLibraryItem['category'], string> = {
  music: '音乐',
  voice: '角色语音',
  generated: '生成音效',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export class AudioStudio {
  private readonly grid = document.getElementById('audio-library-grid') as HTMLElement
  private readonly count = document.getElementById('audio-library-count') as HTMLOutputElement
  private readonly search = document.getElementById('audio-library-search') as HTMLInputElement
  private readonly filters = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-audio-filter]'))
  private readonly form = document.getElementById('audio-generator-form') as HTMLFormElement
  private readonly prompt = document.getElementById('audio-prompt') as HTMLTextAreaElement
  private readonly duration = document.getElementById('audio-duration') as HTMLSelectElement
  private readonly generateButton = document.getElementById('audio-generate-button') as HTMLButtonElement
  private readonly status = document.getElementById('audio-generator-status') as HTMLOutputElement
  private readonly result = document.getElementById('audio-generator-result') as HTMLElement
  private readonly templates = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-audio-template]'))

  private items: AudioLibraryItem[] = []
  private activeFilter = 'all'
  private initialized = false
  private loading = false
  private generating = false

  constructor() {
    this.filters.forEach((button) => button.addEventListener('click', () => {
      this.activeFilter = button.dataset.audioFilter ?? 'all'
      this.filters.forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)))
      this.render()
    }))
    this.search.addEventListener('input', () => this.render())
    this.templates.forEach((button) => button.addEventListener('click', () => {
      this.prompt.value = button.dataset.audioTemplate ?? ''
      this.prompt.focus()
    }))
    this.form.addEventListener('submit', (event) => {
      event.preventDefault()
      void this.generate()
    })
  }

  activate() {
    if (this.initialized || this.loading) return
    this.loading = true
    void Promise.all([this.loadConfig(), this.loadLibrary()]).finally(() => {
      this.loading = false
      this.initialized = true
    })
  }

  private async loadConfig() {
    try {
      const response = await fetch('/api/audio-studio/config')
      const config = await this.readResponse<AudioStudioConfig>(response)
      this.duration.replaceChildren(...config.durations.map((seconds) => {
        const option = document.createElement('option')
        option.value = String(seconds)
        option.textContent = `${seconds} 秒`
        option.selected = seconds === 3
        return option
      }))
      this.generateButton.disabled = !config.keyConfigured
      this.status.textContent = config.keyConfigured
        ? '服务已就绪。输入描述后即可生成，结果会自动加入左侧素材库。'
        : '未检测到 OG_API_KEY。已有音频仍可试听；配置密钥后即可使用文字生成。'
      this.status.dataset.state = config.keyConfigured ? 'ready' : 'warning'
    } catch (error) {
      this.generateButton.disabled = true
      this.setStatus(error instanceof Error ? error.message : '无法读取音效服务配置。', 'error')
    }
  }

  private async loadLibrary() {
    try {
      const response = await fetch('/api/audio-studio/library')
      const payload = await this.readResponse<{ assets: AudioLibraryItem[] }>(response)
      this.items = payload.assets
      this.render()
    } catch (error) {
      this.grid.replaceChildren(this.emptyState(error instanceof Error ? error.message : '无法读取音频素材库。'))
      this.count.textContent = '音频素材读取失败'
    }
  }

  private render() {
    const query = this.search.value.trim().toLocaleLowerCase()
    const visible = this.items.filter((item) => {
      const categoryMatches = this.activeFilter === 'all' || item.category === this.activeFilter
      const searchMatches = !query || `${item.name} ${item.group} ${item.fileName} ${item.prompt ?? ''}`.toLocaleLowerCase().includes(query)
      return categoryMatches && searchMatches
    })

    this.count.textContent = `显示 ${visible.length} 个，共 ${this.items.length} 个音频素材`
    if (!visible.length) {
      this.grid.replaceChildren(this.emptyState('当前筛选条件下没有音频素材。'))
      return
    }
    this.grid.replaceChildren(...visible.map((item) => this.createCard(item)))
  }

  private createCard(item: AudioLibraryItem): HTMLElement {
    const card = document.createElement('article')
    card.className = `audio-card audio-card--${item.category}`

    const header = document.createElement('div')
    header.className = 'audio-card__header'
    const badge = document.createElement('span')
    badge.textContent = CATEGORY_LABEL[item.category]
    const size = document.createElement('small')
    size.textContent = formatBytes(item.byteLength)
    header.append(badge, size)

    const title = document.createElement('h4')
    title.textContent = item.name
    const group = document.createElement('p')
    group.textContent = item.group
    group.title = item.fileName
    const player = document.createElement('audio')
    player.controls = true
    player.preload = 'none'
    player.src = item.url
    player.playbackRate = item.category === 'voice' ? (item.group === '岚·战场指挥' ? COMMANDER_VOICE_PLAYBACK_RATE : item.group === '蜂后无人机' ? DRONE_VOICE_PLAYBACK_RATE : VOICE_PLAYBACK_RATE) : 1
    player.defaultPlaybackRate = player.playbackRate
    player.setAttribute('aria-label', `播放 ${item.name}`)

    card.append(header, title, group, player)
    if (item.prompt) {
      const description = document.createElement('details')
      const summary = document.createElement('summary')
      summary.textContent = '查看生成描述'
      const prompt = document.createElement('p')
      prompt.textContent = item.prompt
      description.append(summary, prompt)
      card.append(description)
    }
    return card
  }

  private async generate() {
    if (this.generating) return
    const prompt = this.prompt.value.trim()
    if (!prompt) {
      this.setStatus('请先用文字描述你想生成的音效。', 'warning')
      this.prompt.focus()
      return
    }

    this.generating = true
    this.generateButton.disabled = true
    this.generateButton.textContent = '正在合成音效…'
    this.result.hidden = true
    this.setStatus('正在根据文字描述合成音效，请稍候…', 'working')

    try {
      const response = await fetch('/api/audio-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, durationSeconds: Number(this.duration.value) }),
      })
      const item = await this.readResponse<AudioLibraryItem>(response)
      this.items = [item, ...this.items.filter((candidate) => candidate.id !== item.id)]
      this.showResult(item)
      this.render()
      this.setStatus(`生成完成：${item.fileName}，已保存并加入素材库。`, 'success')
    } catch (error) {
      this.setStatus(error instanceof Error ? error.message : '音效生成失败，请稍后重试。', 'error')
    } finally {
      this.generating = false
      this.generateButton.disabled = false
      this.generateButton.textContent = '生成音效'
    }
  }

  private showResult(item: AudioLibraryItem) {
    const title = document.createElement('strong')
    title.textContent = '最新生成结果'
    const name = document.createElement('span')
    name.textContent = `${item.name} · ${formatBytes(item.byteLength)}`
    const player = document.createElement('audio')
    player.controls = true
    player.preload = 'metadata'
    player.src = item.url
    player.playbackRate = item.category === 'voice' ? (item.group === '岚·战场指挥' ? COMMANDER_VOICE_PLAYBACK_RATE : item.group === '蜂后无人机' ? DRONE_VOICE_PLAYBACK_RATE : VOICE_PLAYBACK_RATE) : 1
    player.defaultPlaybackRate = player.playbackRate
    player.setAttribute('aria-label', `播放最新生成音效 ${item.name}`)
    this.result.replaceChildren(title, name, player)
    this.result.hidden = false
  }

  private emptyState(message: string): HTMLElement {
    const empty = document.createElement('div')
    empty.className = 'audio-library__empty'
    empty.textContent = message
    return empty
  }

  private setStatus(message: string, state: 'ready' | 'warning' | 'working' | 'success' | 'error') {
    this.status.textContent = message
    this.status.dataset.state = state
  }

  private async readResponse<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => ({})) as T & { message?: string }
    if (!response.ok) throw new Error(payload.message || `请求失败：HTTP ${response.status}`)
    return payload
  }
}

