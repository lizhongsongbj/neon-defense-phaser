import { ANIMATION_CATALOG, ANIMATION_CATEGORY_LABEL, type AnimationCatalogEntry, type AnimationCategory } from '../data/animationCatalog'

export class AnimationPanel {
  private readonly grid: HTMLElement
  private readonly search: HTMLInputElement
  private readonly count: HTMLElement
  private readonly filters: HTMLButtonElement[]
  private readonly detail: HTMLElement
  private activeCategory: AnimationCategory | 'all' = 'all'
  private query = ''

  constructor() {
    this.grid = document.getElementById('animation-grid') as HTMLElement
    this.search = document.getElementById('animation-search') as HTMLInputElement
    this.count = document.getElementById('animation-count') as HTMLElement
    this.detail = document.getElementById('animation-detail') as HTMLElement
    this.filters = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-animation-filter]'))

    this.search.addEventListener('input', () => {
      this.query = this.search.value.trim().toLowerCase()
      this.render()
    })
    this.filters.forEach((button) => button.addEventListener('click', () => {
      this.activeCategory = (button.dataset.animationFilter ?? 'all') as AnimationCategory | 'all'
      this.filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
      this.render()
    }))
    document.getElementById('animation-detail-close')?.addEventListener('click', () => { this.detail.hidden = true })
    document.getElementById('animation-replay')?.addEventListener('click', () => this.replayDetail())
    this.render()
  }

  activate() {
    if (!this.grid.childElementCount) this.render()
  }

  private filteredEntries() {
    return ANIMATION_CATALOG.filter((entry) => {
      if (this.activeCategory !== 'all' && entry.category !== this.activeCategory) return false
      if (!this.query) return true
      return [entry.name, entry.family, entry.level, entry.action, entry.description, ...entry.tags]
        .some((value) => value.toLowerCase().includes(this.query))
    })
  }

  private render() {
    const entries = this.filteredEntries()
    const available = entries.filter((entry) => entry.status === 'available').length
    this.count.textContent = `${entries.length} 项 // ${available} 项已有动画素材 // ${entries.length - available} 项动作预演`
    this.grid.replaceChildren(...entries.map((entry) => this.createCard(entry)))
    if (!entries.length) {
      const empty = document.createElement('div')
      empty.className = 'animation-empty'
      empty.textContent = 'NO MATCH // 没有符合条件的动画'
      this.grid.appendChild(empty)
    }
  }

  private createCard(entry: AnimationCatalogEntry) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `animation-card motion-${entry.motion}`
    button.style.setProperty('--animation-accent', entry.accent)
    button.innerHTML = `
      <span class="animation-card__preview">
        <img src="${entry.previewAsset ?? entry.referenceImage}" alt="${entry.name}${entry.action}动画预览" loading="lazy" />
        <i class="animation-card__fx" aria-hidden="true"></i>
        <em>${entry.status === 'available' ? 'ANIMATED ASSET' : 'MOTION PREVIS'}</em>
      </span>
      <span class="animation-card__body">
        <small>${ANIMATION_CATEGORY_LABEL[entry.category]} // ${entry.level}</small>
        <strong>${entry.name}</strong>
        <b>${entry.action} · ${entry.family}</b>
        <span>${entry.description}</span>
      </span>
    `
    const img = button.querySelector('img') as HTMLImageElement
    img.addEventListener('error', () => {
      if (img.src.endsWith(entry.referenceImage)) return
      img.src = entry.referenceImage
    })
    button.addEventListener('click', () => this.openDetail(entry))
    return button
  }

  private openDetail(entry: AnimationCatalogEntry) {
    this.detail.hidden = false
    this.detail.style.setProperty('--animation-accent', entry.accent)
    const preview = document.getElementById('animation-detail-preview') as HTMLElement
    preview.className = `animation-detail__preview motion-${entry.motion}`
    preview.innerHTML = `<img src="${entry.previewAsset ?? entry.referenceImage}" alt="${entry.name}${entry.action}" /><i class="animation-card__fx" aria-hidden="true"></i>`
    const img = preview.querySelector('img') as HTMLImageElement
    img.addEventListener('error', () => { img.src = entry.referenceImage })
    ;(document.getElementById('animation-detail-code') as HTMLElement).textContent = `${ANIMATION_CATEGORY_LABEL[entry.category]} // ${entry.level}`
    ;(document.getElementById('animation-detail-name') as HTMLElement).textContent = `${entry.name} · ${entry.action}`
    ;(document.getElementById('animation-detail-description') as HTMLElement).textContent = entry.description
    ;(document.getElementById('animation-detail-timeline') as HTMLElement).textContent = entry.timeline
    ;(document.getElementById('animation-detail-status') as HTMLElement).textContent = entry.status === 'available' ? '已有可播放 WebP 动画' : '已完成动作设计，当前使用面板动态预演'
  }

  private replayDetail() {
    const preview = document.getElementById('animation-detail-preview') as HTMLElement
    const className = preview.className
    preview.className = 'animation-detail__preview'
    void preview.offsetWidth
    preview.className = className
  }
}
