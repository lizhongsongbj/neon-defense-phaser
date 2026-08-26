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
    const available = entries.filter((entry) => entry.status === 'available').length    this.count.textContent = `${entries.length} \u9879 // ${available} \u9879\u5df2\u6709\u52a8\u753b\u7d20\u6750 // ${entries.length - available} \u9879\u52a8\u4f5c\u9884\u6f14`
    this.grid.replaceChildren(...entries.map((entry) => this.createCard(entry)))
    if (!entries.length) {
      const empty = document.createElement('div')
      empty.className = 'animation-empty'      empty.textContent = 'NO MATCH // \u6ca1\u6709\u7b26\u5408\u6761\u4ef6\u7684\u52a8\u753b'
      this.grid.appendChild(empty)
    }
  }

  private createCard(entry: AnimationCatalogEntry) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `animation-card motion-${entry.motion}${entry.previewAsset || entry.attackEffectAsset || entry.attackEffectKind ? ' has-asset' : ''}${entry.attackEffectKind ? ` effect-${entry.attackEffectKind}` : ''}`
    button.style.setProperty('--animation-accent', entry.accent)
    this.applyHeadPulseStyle(button, entry)
    button.innerHTML = `
      <span class="animation-card__preview">
        <img src="${entry.previewAsset ?? entry.referenceImage}" alt="${entry.name}${entry.action}动画预览" loading="lazy" />
        <i class="animation-card__fx" aria-hidden="true"></i>
        ${this.headPulseMarkup(entry)}
        ${this.attackEffectMarkup(entry)}
        
        <em>${entry.status === 'available' ? 'ANIMATED ASSET' : 'MOTION PREVIS'}</em>
      </span>
      <span class="animation-card__body">
        <small>${ANIMATION_CATEGORY_LABEL[entry.category]} // ${entry.level}</small>
        <strong>${entry.name}</strong>
        <b>${entry.action} 路 ${entry.family}</b>
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
    this.applyHeadPulseStyle(this.detail, entry)
    const preview = document.getElementById('animation-detail-preview') as HTMLElement
    preview.className = `animation-detail__preview motion-${entry.motion}${entry.previewAsset || entry.attackEffectAsset || entry.attackEffectKind ? ' has-asset' : ''}${entry.attackEffectKind ? ` effect-${entry.attackEffectKind}` : ''}`
    preview.innerHTML = `<img src="${entry.previewAsset ?? entry.referenceImage}" alt="${entry.name}${entry.action}" /><i class="animation-card__fx" aria-hidden="true"></i>${this.headPulseMarkup(entry)}${this.attackEffectMarkup(entry)}`
    const img = preview.querySelector('img') as HTMLImageElement
    img.addEventListener('error', () => { img.src = entry.referenceImage })
    ;(document.getElementById('animation-detail-code') as HTMLElement).textContent = `${ANIMATION_CATEGORY_LABEL[entry.category]} // ${entry.level}`
    ;(document.getElementById('animation-detail-name') as HTMLElement).textContent = `${entry.name} 路 ${entry.action}`
    ;(document.getElementById('animation-detail-description') as HTMLElement).textContent = entry.description
    ;(document.getElementById('animation-detail-timeline') as HTMLElement).textContent = entry.timeline    ;(document.getElementById('animation-detail-status') as HTMLElement).textContent = entry.status === 'available' ? '\u5df2\u6709\u53ef\u64ad\u653e\u52a8\u753b\u6216\u7a0b\u5e8f\u7279\u6548' : '\u5df2\u5b8c\u6210\u52a8\u4f5c\u8bbe\u8ba1\uff0c\u5f53\u524d\u4f7f\u7528\u9762\u677f\u52a8\u6001\u9884\u6f14'
  }

  private applyHeadPulseStyle(target: HTMLElement, entry: AnimationCatalogEntry) {
    const pulse = entry.headPulse
    if (!pulse) return
    target.style.setProperty('--head-pulse-x', `${pulse.x}%`)
    target.style.setProperty('--head-pulse-y', `${pulse.y}%`)
    target.style.setProperty('--head-pulse-scale', String(pulse.scale))
    target.style.setProperty('--head-pulse-accent', pulse.accent)
    target.style.setProperty('--head-pulse-secondary', pulse.secondary)
  }

  private headPulseMarkup(entry: AnimationCatalogEntry) {
    if (!entry.headPulse) return ''
    const sparks = Array.from({ length: 8 }, (_, index) => `<i class="tower-head-pulse__spark" style="--spark-index:${index}"></i>`).join('')
    return `<span class="tower-head-pulse" aria-hidden="true">
      <i class="tower-head-pulse__corona"></i>
      <i class="tower-head-pulse__ring tower-head-pulse__ring--outer"></i>
      <i class="tower-head-pulse__ring tower-head-pulse__ring--inner"></i>
      <i class="tower-head-pulse__core"></i>
      <span class="tower-head-pulse__sparks">${sparks}</span>
    </span>`
  }
  private attackEffectMarkup(entry: AnimationCatalogEntry) {
    if (entry.attackEffectKind === 'gang-rifle') {
      const sparks = Array.from({ length: 7 }, (_, index) => `<i class="gang-rifle__spark" style="--spark-i:${index}"></i>`).join('')
      const tracers = Array.from({ length: 3 }, (_, index) => `<i class="gang-rifle__tracer" style="--shot-i:${index}"></i>`).join('')
      const casings = Array.from({ length: 3 }, (_, index) => `<i class="gang-rifle__casing" style="--shot-i:${index}"></i>`).join('')
      return `<span class="gang-rifle-cycle" aria-hidden="true">
        <img class="gang-rifle__raised-pose" src="/assets/animations/enemies/enemy-01-gang-cyborg-rifle-raised.png?v=raised-pose-20260825" alt="" />
        <i class="gang-rifle__aim-line"></i>
        <i class="gang-rifle__reticle"></i>
        <span class="gang-rifle__muzzle"><i class="gang-rifle__flash"></i>${sparks}</span>
        <span class="gang-rifle__tracers">${tracers}</span>
        <span class="gang-rifle__casings">${casings}</span>
        <i class="gang-rifle__ground-kick"></i>
      </span>`
    }
    if (entry.attackEffectKind === 'gravity-entangle') {
      const particles = Array.from({ length: 38 }, (_, index) => {
        const angle = Math.round((index * 137.508 + (index % 5) * 11) % 360)
        const direction = index % 4 === 0 ? -1 : 1
        const radius = 18 + ((index * 17) % 48)
        const midAngle = angle + direction * (138 + (index % 7) * 9)
        const endAngle = angle + direction * (302 + (index % 9) * 8)
        const delay = (index * 53) % 920
        const duration = 1900 + (index % 8) * 120
        const size = 2 + (index % 4)
        return `<i class="gravity-entangle__particle" style="--gravity-angle:${angle}deg;--gravity-angle-mid:${midAngle}deg;--gravity-angle-end:${endAngle}deg;--gravity-radius:${radius}px;--gravity-delay:${delay}ms;--gravity-duration:${duration}ms;--gravity-size:${size}px"></i>`
      }).join('')
      return `<span class="gravity-attack-cycle" aria-hidden="true">
        <span class="gravity-entangle gravity-entangle--tower">${particles}</span>
      </span>`
    }
    if (entry.attackEffectKind === 'nano-orbit') {
      const particles = Array.from({ length: 46 }, (_, index) => {
        const angle = Math.round((index * 137.508 + (index % 6) * 13) % 360)
        const direction = index % 5 === 0 ? -1 : 1
        const radius = 16 + ((index * 19) % 52)
        const midAngle = angle + direction * (152 + (index % 8) * 8)
        const endAngle = angle + direction * (326 + (index % 10) * 7)
        const delay = (index * 47) % 980
        const duration = 1760 + (index % 9) * 105
        const size = 2 + (index % 4)
        const opacity = (.62 + (index % 5) * .08).toFixed(2)
        return `<i class="nano-orbit__particle" style="--nano-angle:${angle}deg;--nano-angle-mid:${midAngle}deg;--nano-angle-end:${endAngle}deg;--nano-radius:${radius}px;--nano-delay:${delay}ms;--nano-duration:${duration}ms;--nano-size:${size}px;--nano-opacity:${opacity}"></i>`
      }).join('')
      return `<span class="nano-attack-cycle" aria-hidden="true">
        <span class="nano-orbit nano-orbit--tower">${particles}</span>
      </span>`
    }
    if (entry.attackEffectKind === 'trajectory-orbit') {
      const particles = Array.from({ length: 44 }, (_, index) => {
        const angle = Math.round((index * 137.508 + (index % 7) * 9) % 360)
        const direction = index % 3 === 0 ? -1 : 1
        const radius = 18 + ((index * 23) % 58)
        const midAngle = angle + direction * (166 + (index % 8) * 7)
        const endAngle = angle - direction * (48 + (index % 6) * 8)
        const delay = (index * 59) % 1040
        const duration = 1880 + (index % 10) * 110
        const size = 2 + (index % 4)
        const opacity = (.66 + (index % 5) * .07).toFixed(2)
        return `<i class="trajectory-orbit__particle" style="--trajectory-angle:${angle}deg;--trajectory-angle-mid:${midAngle}deg;--trajectory-angle-end:${endAngle}deg;--trajectory-radius:${radius}px;--trajectory-delay:${delay}ms;--trajectory-duration:${duration}ms;--trajectory-size:${size}px;--trajectory-opacity:${opacity}"></i>`
      }).join('')
      return `<span class="trajectory-attack-cycle" aria-hidden="true">
        <span class="trajectory-orbit trajectory-orbit--tower">${particles}</span>
      </span>`
    }
    if (!entry.attackEffectAsset) return ''
    return `<img class="tower-selected-attack-effect tower-selected-attack-effect--${entry.attackEffectKind ?? 'default'}" src="${entry.attackEffectAsset}?v=selection-20260824" alt="" aria-hidden="true" />`
  }
  private replayDetail() {
    const preview = document.getElementById('animation-detail-preview') as HTMLElement
    const className = preview.className
    preview.className = 'animation-detail__preview'
    void preview.offsetWidth
    preview.className = className
  }
}


