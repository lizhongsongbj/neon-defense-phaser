interface OriginGameSdk {
  ready?: () => Promise<void>
}

declare global {
  interface Window {
    OG?: OriginGameSdk
  }
}

let readySignalled = false

/**
 * 在首个可交互网页帧绘制后通知宿主平台。SDK 不存在时保持普通浏览器运行。
 */
export function signalWebGameReady() {
  if (readySignalled) return
  readySignalled = true
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void window.OG?.ready?.().catch((error: unknown) => {
        console.warn('Platform ready signal failed:', error)
      })
    })
  })
}

export function installWebGameGuards() {
  document.addEventListener('contextmenu', (event) => {
    if ((event.target as HTMLElement | null)?.closest('#game-root')) event.preventDefault()
  })
}
