import '../styles/title-entrance.css'

/** Main-menu interactions: keyboard deployment and subtle pointer parallax. */
export class TitleScreen {
  private readonly el: HTMLElement
  private readonly onStart: () => void

  constructor(onStart: () => void) {
    this.el = document.getElementById('title-screen') as HTMLElement
    this.onStart = onStart
    const startButton = document.getElementById('start-game') as HTMLButtonElement
    startButton.addEventListener('click', this.start)
    window.addEventListener('keydown', this.handleKeydown)
    this.el.addEventListener('pointermove', this.handlePointerMove)
    this.el.addEventListener('pointerleave', this.resetPointer)
    this.playCoverIntro()
  }

  private readonly start = () => {
    if (this.el.hidden) return
    this.el.classList.add('is-deploying')
    window.setTimeout(() => {
      this.el.classList.remove('is-deploying')
      this.onStart()
    }, 240)
  }

  private readonly handleKeydown = (event: KeyboardEvent) => {
    if (!this.el.hidden && (event.key === 'Enter' || event.code === 'Space')) {
      event.preventDefault()
      this.start()
    }
  }

  private readonly handlePointerMove = (event: PointerEvent) => {
    const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5
    const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5
    this.el.style.setProperty('--pointer-x', x.toFixed(3))
    this.el.style.setProperty('--pointer-y', y.toFixed(3))
  }

  private readonly resetPointer = () => {
    this.el.style.setProperty('--pointer-x', '0')
    this.el.style.setProperty('--pointer-y', '0')
  }

  private playCoverIntro() {
    this.el.classList.remove('is-cover-entering')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.el.classList.add('is-cover-entering'))
    })
  }

  show() {
    this.el.hidden = false
    this.el.classList.remove('is-deploying')
    this.playCoverIntro()
  }

  hide() {
    this.el.hidden = true
  }
}
