$path = '.\vite.config.ts'
$text = Get-Content -LiteralPath $path -Raw
$text = $text.Replace("import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'", "import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'")
$marker = "function imageStudioPlugin(environment: ImageEnvironment): Plugin {"
$insert = @"
interface GeneratedAssetRecord {
  id: string
  name: string
  fileName: string
  rawUrl: string
  imageUrl: string
  cutoutApplied: boolean
}

async function listGeneratedAssets(specification: AssetSpecification): Promise<GeneratedAssetRecord[]> {
  const readNames = async (directory: string): Promise<string[]> => {
    try {
      return await readdir(directory)
    } catch {
      return []
    }
  }

  const [rawNames, cutoutNames] = await Promise.all([
    readNames(rawDirectory),
    readNames(cutoutDirectory),
  ])
  const rawSet = new Set(rawNames)
  const cutoutSet = new Set(cutoutNames)

  return specification.items.flatMap((item) => {
    const candidates = [...new Set([...rawNames, ...cutoutNames])]
      .filter((name) => name.startsWith(``${item.id}-``) && name.toLowerCase().endsWith('.png'))
      .sort((left, right) => right.localeCompare(left))
    const fileName = candidates[0]
    if (!fileName) return []
    const cutoutApplied = cutoutSet.has(fileName)
    return [{
      id: item.id,
      name: item.name,
      fileName,
      rawUrl: rawSet.has(fileName) ? ``/assets/generated/raw/${fileName}`` : ``/assets/generated/cutout/${fileName}``,
      imageUrl: cutoutApplied ? ``/assets/generated/cutout/${fileName}`` : ``/assets/generated/raw/${fileName}``,
      cutoutApplied,
    }]
  })
}

"@
if (-not $text.Contains($marker)) { throw 'vite marker not found' }
$text = $text.Replace($marker, $insert + $marker)
$apiMarker = "          if (request.method === 'GET' && pathname === '/api/image-studio/config') {"
$apiInsert = @"
          if (request.method === 'GET' && pathname === '/api/image-studio/generated') {
            sendJson(response, 200, { assets: await listGeneratedAssets(specification) })
            return
          }

"@
if (-not $text.Contains($apiMarker)) { throw 'api marker not found' }
$text = $text.Replace($apiMarker, $apiInsert + $apiMarker)
Set-Content -LiteralPath $path -Value $text -Encoding utf8

$path = '.\src\image-studio.ts'
$text = Get-Content -LiteralPath $path -Raw
$text = $text.Replace('let generatedAsset: GeneratedAsset | null = null', "let generatedAsset: GeneratedAsset | null = null`nconst generatedAssets = new Map<string, GeneratedAsset>()")
$old = @"
  generatedAsset = null
  selectedTower.textContent = `${item.towerName} // `${item.categoryId.toUpperCase()}
"@
$new = @"
  generatedAsset = generatedAssets.get(item.id) ?? null
  selectedTower.textContent = `${item.towerName} // `${item.categoryId.toUpperCase()}
"@
if (-not $text.Contains($old)) { throw 'select start marker not found' }
$text = $text.Replace($old, $new)
$old = @"
  resultImage.hidden = true
  resultImage.removeAttribute('src')
  resultPlaceholder.hidden = false
  resultDetails.hidden = true
  publishButton.disabled = true
"@
$new = @"
  if (generatedAsset) {
    resultImage.src = `${generatedAsset.imageUrl}?v=`${encodeURIComponent(generatedAsset.fileName)}
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
"@
if (-not $text.Contains($old)) { throw 'select result marker not found' }
$text = $text.Replace($old, $new)
$text = $text.Replace("button.className = 'asset-item'", "button.className = generatedAssets.has(item.id) ? 'asset-item has-generated' : 'asset-item'")
$old = @"
      button.innerHTML = `<span>BRANCH `${index === 0 ? 'A' : 'B'}</span><strong>`${item.name}</strong><small>`${item.id}</small>`
"@
$new = @"
      button.innerHTML = `<span>BRANCH `${index === 0 ? 'A' : 'B'} `${generatedAssets.has(item.id) ? '// 已生成' : ''}</span><strong>`${item.name}</strong><small>`${item.id}</small>`
"@
if (-not $text.Contains($old)) { throw 'button marker not found' }
$text = $text.Replace($old, $new)
$old = @"
    config = payload
    keyStatus.textContent = payload.keyConfigured ? 'KEY ONLINE // 服务端已配置' : 'KEY OFFLINE // 请配置 OG_API_KEY'
"@
$new = @"
    config = payload
    const generatedResponse = await fetch('/api/image-studio/generated', { cache: 'no-store' })
    if (generatedResponse.ok) {
      const generatedPayload = await generatedResponse.json() as { assets: GeneratedAsset[] }
      generatedPayload.assets.forEach((asset) => generatedAssets.set(asset.id, asset))
    }
    keyStatus.textContent = payload.keyConfigured ? 'KEY ONLINE // 服务端已配置' : 'KEY OFFLINE // 请配置 OG_API_KEY'
"@
if (-not $text.Contains($old)) { throw 'load config marker not found' }
$text = $text.Replace($old, $new)
$old = @"
    generatedAsset = payload
    resultImage.src = `${payload.imageUrl}?v=`${Date.now()}
"@
$new = @"
    generatedAsset = payload
    generatedAssets.set(payload.id, payload)
    document.querySelector<HTMLButtonElement>(``.asset-item[data-asset-id="`${payload.id}"]``)?.classList.add('has-generated')
    resultImage.src = `${payload.imageUrl}?v=`${Date.now()}
"@
if (-not $text.Contains($old)) { throw 'generation marker not found' }
$text = $text.Replace($old, $new)
Set-Content -LiteralPath $path -Value $text -Encoding utf8

$css = '.\src\styles\image-studio.css'
$cssText = Get-Content -LiteralPath $css -Raw
$cssText = $cssText.Replace('.asset-item:hover {', ".asset-item.has-generated span { color: #72ffae; }`n.asset-item.has-generated { border-color: rgba(82, 255, 157, .28); }`n.asset-item:hover {")
Set-Content -LiteralPath $css -Value $cssText -Encoding utf8
