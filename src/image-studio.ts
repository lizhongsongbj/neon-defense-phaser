import './styles/image-studio.css'
import { ENEMY_TYPES, type EnemyDefinition } from './data/enemies'
import { BOSS_TYPES, type BossDefinition } from './data/bosses'

interface AssetItem {
  id: string
  tier: number
  kind?: string
  branch?: string
  categoryId: string
  towerName: string
  name: string
  referenceAsset: string
  targetFile: string
  prompt: string
}

interface StudioConfig {
  keyConfigured: boolean
  sizes: string[]
  stylePrompt: string
  items: AssetItem[]
}

interface GeneratedAsset {
  id: string
  name: string
  fileName: string
  rawUrl: string
  imageUrl: string
  cutoutApplied: boolean
}

const assetList = document.getElementById('asset-list') as HTMLElement
const monsterLibraryGrid = document.getElementById('monster-library-grid') as HTMLElement
const monsterCount = document.getElementById('monster-count') as HTMLElement
const studioSectionTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-studio-section]'))
const studioPanels = Array.from(document.querySelectorAll<HTMLElement>('[data-studio-panel]'))
const keyStatus = document.getElementById('key-status') as HTMLElement
const selectedTower = document.getElementById('selected-tower') as HTMLElement
const selectedName = document.getElementById('selected-name') as HTMLElement
const referenceImage = document.getElementById('reference-image') as HTMLImageElement
const resultImage = document.getElementById('result-image') as HTMLImageElement
const resultPlaceholder = document.getElementById('result-placeholder') as HTMLElement
const generationScan = document.getElementById('generation-scan') as HTMLElement
const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement
const sizeSelect = document.getElementById('size-select') as HTMLSelectElement
const outputMode = document.getElementById('output-mode') as HTMLSelectElement
const generationForm = document.getElementById('generation-form') as HTMLFormElement
const generateButton = document.getElementById('generate-button') as HTMLButtonElement
const publishButton = document.getElementById('publish-button') as HTMLButtonElement
const studioStatus = document.getElementById('studio-status') as HTMLOutputElement
const resultDetails = document.getElementById('result-details') as HTMLElement
const resultFile = document.getElementById('result-file') as HTMLElement
const resultMode = document.getElementById('result-mode') as HTMLElement
const publishedFile = document.getElementById('published-file') as HTMLElement
const rawLink = document.getElementById('raw-link') as HTMLAnchorElement
const processedLink = document.getElementById('processed-link') as HTMLAnchorElement
const returnGameButton = document.getElementById('return-game-button') as HTMLAnchorElement


let config: StudioConfig | null = null
let selectedItem: AssetItem | null = null
let generatedAsset: GeneratedAsset | null = null
const generatedAssets = new Map<string, GeneratedAsset>()

function setStatus(message: string, tone: 'ready' | 'working' | 'error' | 'success' = 'ready') {
  studioStatus.textContent = message
  studioStatus.dataset.tone = tone
}

function setWorking(working: boolean) {
  generateButton.disabled = working || !selectedItem || !config?.keyConfigured
  generationScan.hidden = !working
  if (working) {
    resultPlaceholder.hidden = true
    resultImage.hidden = true
  }
}

function selectItem(item: AssetItem) {
  selectedItem = item
  generatedAsset = generatedAssets.get(item.id) ?? null
  selectedTower.textContent = `${item.towerName} // ${item.categoryId.toUpperCase()}`
  selectedName.textContent = item.name
  referenceImage.src = `${item.referenceAsset}?v=alpha-20260824-2`
  referenceImage.alt = `${item.towerName}基础造型参考`
  promptInput.value = item.prompt
  if (generatedAsset) {
    resultImage.src = `${generatedAsset.imageUrl}?v=${encodeURIComponent(generatedAsset.fileName)}-alpha-20260824-2`
    resultImage.hidden = false
    resultPlaceholder.hidden = true
    resultDetails.hidden = false
    resultFile.textContent = generatedAsset.fileName
    resultMode.textContent = generatedAsset.cutoutApplied ? '边缘白底已透明化' : '保留原始输出'
    rawLink.href = generatedAsset.rawUrl
    processedLink.href = generatedAsset.imageUrl
    publishButton.disabled = false
  } else {
    resultImage.hidden = true
    resultImage.removeAttribute('src')
    resultPlaceholder.hidden = false
    resultDetails.hidden = true
    publishButton.disabled = true
  }
  publishedFile.textContent = '尚未发布'
  document.querySelectorAll<HTMLButtonElement>('.asset-item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.assetId === item.id)
  })
  setStatus(`READY // 已载入 ${item.towerName} · ${item.name}`, 'ready')
  setWorking(false)
}

function renderAssetList(items: AssetItem[]) {
  assetList.replaceChildren()
  const groups = new Map<string, AssetItem[]>()
  items.forEach((item) => {
    const group = groups.get(item.towerName) ?? []
    group.push(item)
    groups.set(item.towerName, group)
  })

  groups.forEach((groupItems, towerName) => {
    const group = document.createElement('section')
    group.className = 'asset-group'
    const heading = document.createElement('h3')
    heading.textContent = towerName
    group.append(heading)
    groupItems.forEach((item, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = generatedAssets.has(item.id) ? 'asset-item has-generated' : 'asset-item'
      button.dataset.assetId = item.id
      button.innerHTML = `<span>${item.kind === 'unit' ? 'UNIT // 独立单位' : `TIER ${item.tier}${item.branch ? ` // BRANCH ${item.branch}` : ''}`} ${generatedAssets.has(item.id) ? '// 已生成' : ''}</span><strong>${item.name}</strong><small>${item.id}</small>`
      button.addEventListener('click', () => selectItem(item))
      group.append(button)
    })
    assetList.append(group)
  })
}

function bindStudioSections() {
  studioSectionTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.studioSection
      studioSectionTabs.forEach((candidate) => {
        const active = candidate === tab
        candidate.classList.toggle('is-active', active)
        candidate.setAttribute('aria-pressed', String(active))
      })
      studioPanels.forEach((panel) => {
        panel.hidden = panel.dataset.studioPanel !== target
      })
    })
  })
}

function renderMonsterLibrary() {
  type HostileDefinition = EnemyDefinition | BossDefinition
  const hostiles: HostileDefinition[] = [...Object.values(ENEMY_TYPES), ...Object.values(BOSS_TYPES)]
  monsterCount.textContent = `${hostiles.length} 个已接入单位 // 点击图像查看原图`
  monsterLibraryGrid.replaceChildren(...hostiles.map((def, index) => {
    const isBoss = 'boss' in def && def.boss
    const shield = 'shield' in def && def.shield ? `<span>护盾 <b>${def.shield}</b></span>` : ''
    const card = document.createElement('a')
    card.className = `monster-library-card${isBoss ? ' is-boss' : ''}`
    card.href = def.image
    card.target = '_blank'
    card.rel = 'noreferrer'
    card.title = `查看 ${def.name} 原图`
    card.innerHTML = `
      <div class="monster-library-card__visual">
        <small>TARGET // ${String(index + 1).padStart(2, '0')}</small>
        <img src="${def.image}" alt="${def.name}" loading="lazy" />
        <em>${isBoss ? 'BOSS' : def.mechanical ? '机械' : '生物'}</em>
      </div>
      <div class="monster-library-card__copy">
        <strong>${def.name}</strong>
        <div><span>生命 <b>${def.hp}</b></span>${shield}<span>攻击 <b>${def.attack}</b></span><span>速度 <b>${def.speed}</b></span><span>护甲 <b>${Math.round(def.armor * 100)}%</b></span><span>赏金 <b>${def.reward}</b></span></div>
        <p>${def.trait}</p>
      </div>`
    return card
  }))
}
async function loadConfig() {
  try {
    const response = await fetch('/api/image-studio/config', { cache: 'no-store' })
    const payload = await response.json() as StudioConfig & { message?: string }
    if (!response.ok) throw new Error(payload.message || `HTTP ${response.status}`)
    config = payload
    const generatedResponse = await fetch('/api/image-studio/generated', { cache: 'no-store' })
    if (generatedResponse.ok) {
      const generatedPayload = await generatedResponse.json() as { assets: GeneratedAsset[] }
      generatedPayload.assets.forEach((asset) => generatedAssets.set(asset.id, asset))
    }
    keyStatus.textContent = payload.keyConfigured ? 'KEY ONLINE // 服务端已配置' : 'KEY OFFLINE // 请配置 OG_API_KEY'
    keyStatus.dataset.online = String(payload.keyConfigured)
    sizeSelect.replaceChildren(...payload.sizes.map((size) => {
      const option = document.createElement('option')
      option.value = size
      option.textContent = size
      return option
    }))
    renderAssetList(payload.items)
    if (payload.items[0]) selectItem(payload.items[0])
    if (!payload.keyConfigured) {
      setStatus('OFFLINE // 在项目 .env.local 中配置 OG_API_KEY 后重启开发服务器', 'error')
    }
  } catch (error) {
    keyStatus.textContent = 'API OFFLINE // 本地接口不可用'
    keyStatus.dataset.online = 'false'
    setStatus(`ERROR // ${error instanceof Error ? error.message : '无法载入工作台配置'}`, 'error')
  }
}

generationForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (!selectedItem || !config) return
  generatedAsset = null
  publishButton.disabled = true
  resultDetails.hidden = true
  setWorking(true)
  setStatus(`GENERATING // 正在生成 ${selectedItem.towerName} · ${selectedItem.name}，请耐心等待`, 'working')

  try {
    const response = await fetch('/api/generate-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedItem.id,
        prompt: promptInput.value,
        size: sizeSelect.value,
        outputMode: outputMode.value,
      }),
    })
    const payload = await response.json() as GeneratedAsset & { message?: string }
    if (!response.ok) throw new Error(payload.message || `HTTP ${response.status}`)
    generatedAsset = payload
    generatedAssets.set(payload.id, payload)
    document.querySelector<HTMLButtonElement>(`.asset-item[data-asset-id="${payload.id}"]`)?.classList.add('has-generated')
    resultImage.src = `${payload.imageUrl}?v=${Date.now()}`
    resultImage.hidden = false
    resultPlaceholder.hidden = true
    resultDetails.hidden = false
    resultFile.textContent = payload.fileName
    resultMode.textContent = payload.cutoutApplied ? '边缘白底已透明化' : '保留原始输出'
    rawLink.href = payload.rawUrl
    processedLink.href = payload.imageUrl
    publishButton.disabled = false
    setStatus(`COMPLETE // ${payload.name} 候选图生成完成`, 'success')
  } catch (error) {
    resultPlaceholder.hidden = false
    setStatus(`ERROR // ${error instanceof Error ? error.message : '生成失败'}`, 'error')
  } finally {
    setWorking(false)
  }
})

publishButton.addEventListener('click', async () => {
  if (!selectedItem || !generatedAsset) return
  publishButton.disabled = true
  setStatus(`PUBLISHING // 正在发布 ${selectedItem.name}`, 'working')
  try {
    const response = await fetch('/api/publish-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedItem.id, imageUrl: generatedAsset.imageUrl }),
    })
    const payload = await response.json() as { gameUrl?: string; targetFile?: string; message?: string }
    if (!response.ok || !payload.gameUrl) throw new Error(payload.message || `HTTP ${response.status}`)
    publishedFile.textContent = payload.gameUrl
    setStatus(`PUBLISHED // 已发布到 ${payload.gameUrl}`, 'success')
  } catch (error) {
    setStatus(`ERROR // ${error instanceof Error ? error.message : '发布失败'}`, 'error')
    publishButton.disabled = false
  }
})

returnGameButton.addEventListener('click', (event) => {
  event.preventDefault()
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'neon-defense:return-from-image-studio' }, window.location.origin)
    return
  }
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  window.location.assign('/')
})

bindStudioSections()
renderMonsterLibrary()
void loadConfig()






