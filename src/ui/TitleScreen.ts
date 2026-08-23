/** 主界面(HTML+CSS),对应原版 #title-screen。点击"开始游戏"进入指挥中心。 */
export class TitleScreen {
  private readonly el: HTMLElement

  constructor(onStart: () => void) {
    this.el = document.getElementById('title-screen') as HTMLElement
    const startButton = document.getElementById('start-game') as HTMLButtonElement
    startButton.addEventListener('click', () => onStart())
  }

  show() {
    this.el.hidden = false
  }

  hide() {
    this.el.hidden = true
  }
}
