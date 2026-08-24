import { EFFECT_CATALOG, EFFECT_CATEGORY_LABEL, type EffectCatalogEntry, type EffectCategory } from '../data/effectCatalog'

export class EffectPanel {
  private readonly grid = document.getElementById('effect-grid') as HTMLElement
  private readonly search = document.getElementById('effect-search') as HTMLInputElement
  private readonly count = document.getElementById('effect-count') as HTMLElement
  private readonly detail = document.getElementById('effect-detail') as HTMLElement
  private readonly filters = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-effect-filter]'))
  private activeCategory: EffectCategory | 'all' = 'all'
  private query = ''

  constructor() {
    this.search.addEventListener('input', () => {
      this.query = this.search.value.trim().toLowerCase()
      this.render()
    })
    this.filters.forEach((button) => button.addEventListener('click', () => {
      this.activeCategory = (button.dataset.effectFilter ?? 'all') as EffectCategory | 'all'
      this.filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
      this.render()
    }))
    document.getElementById('effect-detail-close')?.addEventListener('click', () => { this.detail.hidden = true })
    document.getElementById('effect-replay')?.addEventListener('click', () => this.replayDetail())
    this.render()
  }

  activate() {
    if (!this.grid.childElementCount) this.render()
  }

  private filteredEntries() {
    return EFFECT_CATALOG.filter((entry) => {
      if (this.activeCategory !== 'all' && entry.category !== this.activeCategory) return false
      if (!this.query) return true
      return [entry.name, entry.family, entry.motion, entry.description, ...entry.layers, ...entry.tags]
        .some((value) => value.toLowerCase().includes(this.query))
    })
  }

  private render() {
    const entries = this.filteredEntries()
    const deathCount = entries.filter((entry) => entry.category.endsWith('death')).length
    this.count.textContent = `${entries.length} 项 // ${deathCount} 项死亡特效 // PROCEDURAL PREVIEW`
    this.grid.replaceChildren(...entries.map((entry) => this.createCard(entry)))
    if (!entries.length) {
      const empty = document.createElement('div')
      empty.className = 'effect-empty'
      empty.textContent = 'NO MATCH // 没有符合条件的特效'
      this.grid.appendChild(empty)
    }
  }

  private createCard(entry: EffectCatalogEntry) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `effect-card effect-${entry.motion}`
    button.style.setProperty('--effect-accent', entry.accent)
    button.style.setProperty('--effect-secondary', entry.secondary)
    button.innerHTML = `
      <span class="effect-preview">${this.previewMarkup(entry)}<em>FX PREVIS // ${entry.motion.toUpperCase()}</em></span>
      <span class="effect-card__body">
        <small>${EFFECT_CATEGORY_LABEL[entry.category]} // ${entry.family}</small>
        <strong>${entry.name}</strong>
        <span>${entry.description}</span>
        <i>${entry.layers.join(' · ')}</i>
      </span>
    `
    button.addEventListener('click', () => this.openDetail(entry))
    return button
  }

  private previewMarkup(entry: EffectCatalogEntry) {
    const particles = Array.from({ length: 12 }, (_, index) => `<i class="effect-particle" style="--i:${index}"></i>`).join('')
    const remnant = entry.remnantAsset ? `<img class="effect-remnant" src="${entry.remnantAsset}" alt="" />` : ''
    if (entry.category === 'mercenary-death') {
      const image = entry.id.includes('shield')
        ? '/assets/units/mercenary-shield.png'
        : entry.id.includes('rifle')
          ? '/assets/units/mercenary-rifle.png'
          : '/assets/generated/cutout/street-mercenary-unit-2026-08-23T12-16-30-502Z.png'
      const vectors = [[-25,-16,-18], [18,-22,14], [-34,8,-29], [29,12,26], [-12,25,-8], [8,29,11], [-22,18,-17], [24,-5,21]]
      const droplets = vectors.map(([dx,dy,rotation], index) => `<i class="effect-blood-drop" style="--i:${index};--dx:${dx}px;--dy:${dy}px;--drop-rotate:${rotation}deg"></i>`).join('')
      return `<span class="effect-stage effect-stage--mercenary-death" aria-hidden="true">${remnant}
        <img class="effect-mercenary-predeath" src="${image}" alt="" /><span class="effect-blood-drops">${droplets}</span>
      </span>`
    }
    if (entry.category === 'drone-death') {
      return `<span class="effect-stage effect-stage--drone-death" aria-hidden="true">${remnant}
        <img class="effect-drone-precrash" src="/assets/generated/cutout/drone-hive-unit-2026-08-24T16-11-53-567Z.png" alt="" />
        <img class="effect-drone-flame" src="/assets/effects/drone-crash-flame.png" alt="" />
      </span>`
    }
    return `<span class="effect-stage" aria-hidden="true">${remnant}
      <i class="effect-core"></i><i class="effect-beam"></i><i class="effect-ring effect-ring--a"></i><i class="effect-ring effect-ring--b"></i>
      <i class="effect-scanline"></i><i class="effect-shard effect-shard--a"></i><i class="effect-shard effect-shard--b"></i>
      <span class="effect-particles">${particles}</span>
    </span>`
  }

  private openDetail(entry: EffectCatalogEntry) {
    this.detail.hidden = false
    this.detail.style.setProperty('--effect-accent', entry.accent)
    this.detail.style.setProperty('--effect-secondary', entry.secondary)
    const preview = document.getElementById('effect-detail-preview') as HTMLElement
    preview.className = `effect-detail__preview effect-${entry.motion}`
    preview.innerHTML = this.previewMarkup(entry)
    ;(document.getElementById('effect-detail-code') as HTMLElement).textContent = `${EFFECT_CATEGORY_LABEL[entry.category]} // ${entry.motion.toUpperCase()}`
    ;(document.getElementById('effect-detail-name') as HTMLElement).textContent = entry.name
    ;(document.getElementById('effect-detail-description') as HTMLElement).textContent = entry.description
    ;(document.getElementById('effect-detail-timeline') as HTMLElement).textContent = entry.timeline
    ;(document.getElementById('effect-detail-layers') as HTMLElement).textContent = entry.layers.join(' / ')
  }

  private replayDetail() {
    const preview = document.getElementById('effect-detail-preview') as HTMLElement
    const className = preview.className
    preview.className = 'effect-detail__preview'
    void preview.offsetWidth
    preview.className = className
  }
}
