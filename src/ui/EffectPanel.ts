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
    // 每个特效由自身 ID 生成独一份火花轨迹：方向、数量、起点、速度和赤焰色阶都不重复。
    const seed = [...entry.id].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261)
    const random = (index: number, salt: number) => {
      let value = seed ^ Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(salt + 1, 0x27d4eb2d)
      value ^= value >>> 16
      value = Math.imul(value, 0x7feb352d)
      value ^= value >>> 15
      value = Math.imul(value, 0x846ca68b)
      value ^= value >>> 16
      return (value >>> 0) / 0xffffffff
    }
    const remnantKind = entry.remnantAsset?.includes('mechanical-parts') ? 'mechanical' : 'biological'
    const isMechanicalEnemyDeath = entry.category === 'enemy-death' && remnantKind === 'mechanical'
    const isBiologicalEnemyDeath = entry.category === 'enemy-death' && remnantKind === 'biological'
    const flamePalettes = [
      ['#fff3c4', '#ffad24', '#db2b16'],
      ['#fff0a6', '#ff7b19', '#a90f0b'],
      ['#ffe5b0', '#ff9630', '#c51d12'],
      ['#fff7d8', '#ff651c', '#8f120c'],
    ] as const
    const sparkText = [entry.name, entry.description, entry.timeline, ...entry.layers].join('')
    const isSparkEffect = isMechanicalEnemyDeath || (!isBiologicalEnemyDeath && /火花|爆破|爆裂|燃烧|熔融|余烬/.test(sparkText))
    const palette: readonly [string, string, string] = isSparkEffect
      ? flamePalettes[seed % flamePalettes.length]
      : ['#ffffff', entry.accent, entry.secondary]
    const baseAngles = [-18, 32, -72, 118, 168, -132]
    const baseAngle = baseAngles[seed % baseAngles.length]
    const spread = 34 + random(0, 3) * 58
    const sparkCount = 9 + (seed % 7)
    const particles = Array.from({ length: sparkCount }, (_, index) => {
      const angle = (baseAngle + (random(index, 1) - .5) * spread + (random(index, 2) - .5) * 17) * Math.PI / 180
      const distance = 24 + random(index, 3) * 72
      const originX = entry.motion === 'beam' ? 70 + random(index, 4) * 7 : entry.motion === 'scan' ? 16 + random(index, 4) * 68 : 46 + random(index, 4) * 8
      const originY = entry.motion === 'beam' ? 43 + random(index, 5) * 14 : entry.motion === 'scan' ? 20 + random(index, 5) * 60 : 46 + random(index, 5) * 8
      const dx = Math.cos(angle) * distance
      const dy = Math.sin(angle) * distance
      const lift = 5 + random(index, 6) * 18
      const gravity = 8 + random(index, 7) * 28
      const midX = dx * (.43 + random(index, 8) * .2)
      const midY = dy * .5 - lift
      const finalY = dy + gravity
      const rotation = Math.atan2(finalY, dx) * 180 / Math.PI
      const delay = Math.round(random(index, 9) * 230)
      const duration = Math.round(1080 + random(index, 10) * 920)
      const scale = (.42 + random(index, 11) * .88).toFixed(2)
      const width = Math.round(3 + random(index, 12) * 7)
      const particleClass = isBiologicalEnemyDeath ? ' effect-particle--biological' : isSparkEffect ? ' effect-particle--spark' : ''
      return `<i class="effect-particle${particleClass}" style="--i:${index};--spark-origin-x:${originX.toFixed(1)}%;--spark-origin-y:${originY.toFixed(1)}%;--spark-mid-x:${midX.toFixed(1)}px;--spark-mid-y:${midY.toFixed(1)}px;--spark-x:${dx.toFixed(1)}px;--spark-y:${finalY.toFixed(1)}px;--spark-rotate:${rotation.toFixed(1)}deg;--spark-delay:${delay}ms;--spark-duration:${duration}ms;--spark-scale:${scale};--spark-width:${width}px;--spark-hot:${palette[0]};--spark-mid:${palette[1]};--spark-tail:${palette[2]}"></i>`
    }).join('')
    const remnant = entry.remnantAsset ? `<img class="effect-remnant effect-remnant--${remnantKind}" src="${entry.remnantAsset}" alt="" />` : ''
    const bloodMist = isBiologicalEnemyDeath
      ? `<span class="effect-biological-blood-mist">${Array.from({ length: 15 + (seed % 5) }, (_, index) => {
          const originX = 43 + random(index, 31) * 14
          const originY = 43 + random(index, 32) * 14
          const dx = (random(index, 33) - .5) * 94
          const dy = -18 - random(index, 34) * 62
          const rotation = -35 + random(index, 35) * 70
          const delay = Math.round(random(index, 36) * 260)
          const duration = Math.round(1450 + random(index, 37) * 1050)
          const size = Math.round(18 + random(index, 38) * 34)
          const stretch = (.72 + random(index, 39) * .9).toFixed(2)
          const density = (.48 + random(index, 40) * .42).toFixed(2)
          return `<i class="effect-blood-mist-puff" style="--mist-origin-x:${originX.toFixed(1)}%;--mist-origin-y:${originY.toFixed(1)}%;--mist-x:${dx.toFixed(1)}px;--mist-y:${dy.toFixed(1)}px;--mist-rotate:${rotation.toFixed(1)}deg;--mist-delay:${delay}ms;--mist-duration:${duration}ms;--mist-size:${size}px;--mist-stretch:${stretch};--mist-density:${density}"></i>`
        }).join('')}<b class="effect-blood-mist-core"></b></span>`
      : ''
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
    const fragmentCount = 8 + (seed % 6)
    const fragments = Array.from({ length: fragmentCount }, (_, index) => {
      const angle = (baseAngle + (random(index, 21) - .5) * (spread * 1.3)) * Math.PI / 180
      const distance = 18 + random(index, 22) * 68
      const dx = Math.cos(angle) * distance
      const dy = Math.sin(angle) * distance + random(index, 23) * 16
      const rotation = -75 + random(index, 24) * 150
      const delay = Math.round(random(index, 25) * 190)
      return `<i class="effect-material-fragment" style="--i:${index};--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--fragment-rotate:${rotation.toFixed(1)}deg;--fragment-delay:${delay}ms"></i>`
    }).join('')
    const arcSegments = [[8,46,-12],[23,42,8],[38,49,-10],[53,43,13],[68,48,-8],[83,44,7]].map(([left,width,rotation], index) => `<i class="effect-arc-segment" style="--i:${index};left:${left}%;width:${width}px;--segment-rotate:${rotation}deg"></i>`).join('')
    const smoke = Array.from({ length: 4 }, (_, index) => `<i class="effect-industrial-smoke" style="--i:${index}"></i>`).join('')
    const categoryClass = entry.category === 'enemy-death'
      ? ` effect-stage--enemy-death effect-stage--enemy-${remnantKind}`
      : ''
    return `<span class="effect-stage effect-stage--industrial effect-stage--${entry.motion}${categoryClass}" aria-hidden="true">${remnant}${bloodMist}
      <span class="effect-industrial-tracer"><i class="effect-tracer-sheath"></i><i class="effect-tracer-heat"></i><i class="effect-tracer-core"></i></span>
      <span class="effect-industrial-arc">${arcSegments}</span>
      <i class="effect-industrial-flash"></i><span class="effect-material-fragments">${fragments}</span><span class="effect-industrial-smokes">${smoke}</span>
      <span class="effect-particles effect-particles--material">${particles}</span>
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
