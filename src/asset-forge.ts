import './styles/theme.css'
import './styles/ui-polish.css'
import './styles/internal-neon-theme.css'
import { AnimationPanel } from './ui/AnimationPanel'
import { EffectPanel } from './ui/EffectPanel'
import { AudioStudio } from './ui/AudioStudio'
import { UIArtStudio } from './ui/UIArtStudio'

const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-asset-tab]'))
const panels = new Map(
  Array.from(document.querySelectorAll<HTMLElement>('[data-asset-panel]')).map((panel) => [panel.dataset.assetPanel ?? '', panel]),
)

const animationPanel = new AnimationPanel()
const effectPanel = new EffectPanel()
const audioStudio = new AudioStudio()
const uiArtStudio = new UIArtStudio()

function activatePanel(target: string) {
  tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.assetTab === target)))
  panels.forEach((panel, key) => { panel.hidden = key !== target })

  if (target === 'animations') animationPanel.activate()
  if (target === 'effects') effectPanel.activate()
  if (target === 'audio') audioStudio.activate()
  if (target === 'ui-art') uiArtStudio.activate()
  if (target === 'studio') {
    const frame = panels.get('studio')?.querySelector<HTMLIFrameElement>('.image-studio-frame')
    if (frame && !frame.src) frame.src = frame.dataset.src ?? './image-studio.html'
  }

  const url = new URL(window.location.href)
  url.searchParams.set('panel', target)
  window.history.replaceState(null, '', url)
}

tabs.forEach((tab) => tab.addEventListener('click', () => activatePanel(tab.dataset.assetTab ?? 'animations')))
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return
  if (event.data?.type === 'neon-defense:return-from-image-studio') activatePanel('animations')
})

const requestedPanel = new URLSearchParams(window.location.search).get('panel')
activatePanel(requestedPanel && panels.has(requestedPanel) ? requestedPanel : 'animations')
