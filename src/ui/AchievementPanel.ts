import { ACHIEVEMENT_CATEGORY_LABEL, ACHIEVEMENT_TOTAL, type AchievementCategory, type AchievementDefinition } from '../data/achievements'
import { EventBus, GameEvents } from '../state/EventBus'
import type { AchievementSystem } from '../systems/AchievementSystem'

type Filter = 'all' | AchievementCategory | 'unlocked'

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!)
}

export class AchievementPanel {
  private readonly overlay = document.getElementById('achievement-overlay') as HTMLElement
  private readonly grid = document.getElementById('achievement-grid') as HTMLElement
  private readonly completedCount = document.getElementById('achievement-completed-count') as HTMLElement
  private readonly totalProgress = document.getElementById('achievement-total-progress') as HTMLElement
  private readonly filters = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-achievement-filter]'))
  private readonly notificationHost = document.getElementById('achievement-notification-host') as HTMLElement
  private filter: Filter = 'all'
  private notificationQueue: AchievementDefinition[] = []
  private notificationActive = false

  constructor(private readonly system: AchievementSystem) {
    document.getElementById('achievement-command-button')?.addEventListener('click', () => this.open())
    document.getElementById('achievement-button')?.addEventListener('click', () => this.open())
    document.getElementById('achievement-close')?.addEventListener('click', () => this.close())
    document.getElementById('achievement-backdrop')?.addEventListener('click', () => this.close())
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.overlay.hidden) this.close()
    })
    this.filters.forEach((button) => {
      button.addEventListener('click', () => {
        this.filter = (button.dataset.achievementFilter ?? 'all') as Filter
        this.filters.forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
        this.render()
      })
    })
    EventBus.on(GameEvents.AchievementStateChanged, this.render, this)
    EventBus.on(GameEvents.AchievementUnlocked, this.onUnlocked, this)
    this.render()
  }

  open() {
    this.render()
    this.overlay.hidden = false
    requestAnimationFrame(() => this.overlay.classList.add('is-open'))
    document.body.classList.add('achievement-panel-open')
  }

  close() {
    this.overlay.classList.remove('is-open')
    document.body.classList.remove('achievement-panel-open')
    window.setTimeout(() => {
      if (!this.overlay.classList.contains('is-open')) this.overlay.hidden = true
    }, 180)
  }

  private render() {
    const state = this.system.state()
    const unlockedCount = Object.keys(state.unlockedAt).length
    this.completedCount.textContent = `${unlockedCount} / ${ACHIEVEMENT_TOTAL}`
    this.totalProgress.style.width = `${Math.round((unlockedCount / ACHIEVEMENT_TOTAL) * 100)}%`

    const definitions = this.system.definitions().filter((definition) => {
      if (this.filter === 'all') return true
      if (this.filter === 'unlocked') return this.system.isUnlocked(definition.id)
      return definition.category === this.filter
    })

    this.grid.innerHTML = definitions.map((definition, index) => this.cardHtml(definition, index)).join('') || '<div class="achievement-empty">当前筛选条件下没有已完成的成就。</div>'
  }

  private cardHtml(definition: AchievementDefinition, index: number) {
    const unlocked = this.system.isUnlocked(definition.id)
    const concealed = Boolean(definition.hidden && !unlocked)
    const progress = Math.max(0, this.system.progressFor(definition))
    const target = definition.target ?? 0
    const percent = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : unlocked ? 100 : 0
    const name = concealed ? '？？？' : definition.name
    const condition = concealed ? '隐藏成就，完成特殊行动后才会公开条件。' : definition.condition
    const category = concealed ? '加密记录' : ACHIEVEMENT_CATEGORY_LABEL[definition.category]
    const sequence = String(index + 1).padStart(2, '0')
    const unlockedDate = unlocked ? new Date(this.system.state().unlockedAt[definition.id]).toLocaleDateString('zh-CN') : ''
    const progressText = target > 0 && !unlocked ? `<span>${Math.min(progress, target).toFixed(Number.isInteger(progress) ? 0 : 1)} / ${target}</span>` : `<span>${unlocked ? '已完成' : '未完成'}</span>`

    return `
      <article class="achievement-card${unlocked ? ' is-unlocked' : ''}${concealed ? ' is-hidden' : ''}">
        <div class="achievement-card__icon" aria-hidden="true">${unlocked ? '✓' : concealed ? '?' : sequence}</div>
        <div class="achievement-card__body">
          <div class="achievement-card__meta"><span>${escapeHtml(category)}</span><em>${unlocked ? escapeHtml(unlockedDate) : 'LOCKED'}</em></div>
          <h3>${escapeHtml(name)}</h3>
          <p><b>完成条件</b>${escapeHtml(condition)}</p>
          <div class="achievement-card__progress"><i><b style="width:${percent}%"></b></i>${progressText}</div>
        </div>
      </article>
    `
  }

  private onUnlocked(payload: { definition: AchievementDefinition }) {
    if (!payload?.definition) return
    this.notificationQueue.push(payload.definition)
    this.render()
    this.showNextNotification()
  }

  private showNextNotification() {
    if (this.notificationActive || !this.notificationQueue.length) return
    this.notificationActive = true
    const definition = this.notificationQueue.shift()!
    const banner = document.createElement('article')
    banner.className = 'achievement-notification'
    banner.innerHTML = `
      <div class="achievement-notification__icon">✓</div>
      <div class="achievement-notification__copy">
        <span>成就已完成</span>
        <strong>${escapeHtml(definition.name)}</strong>
        <p><b>完成条件：</b>${escapeHtml(definition.condition)}</p>
      </div>
      <button type="button" aria-label="查看成就">查看</button>
    `
    banner.querySelector('button')?.addEventListener('click', () => {
      this.open()
      this.dismissNotification(banner)
    })
    this.notificationHost.append(banner)
    requestAnimationFrame(() => banner.classList.add('is-visible'))
    window.setTimeout(() => this.dismissNotification(banner), 5200)
  }

  private dismissNotification(banner: HTMLElement) {
    if (!banner.isConnected) return
    banner.classList.remove('is-visible')
    window.setTimeout(() => {
      banner.remove()
      this.notificationActive = false
      this.showNextNotification()
    }, 260)
  }
}
