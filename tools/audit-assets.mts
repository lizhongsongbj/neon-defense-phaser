import { ANIMATION_CATALOG } from '../src/data/animationCatalog'
import { EFFECT_CATALOG } from '../src/data/effectCatalog'
import { ENEMY_TYPES } from '../src/data/enemies'
import { TOWER_TYPE_BY_ID } from '../src/data/towers'
import { ALL_TOWER_TYPE_BY_ID } from '../src/data/towerExpansion'
import { BOSS_TYPES } from '../src/data/bosses'
import fs from 'node:fs'
import path from 'node:path'

const urls: Array<[string, string, string]> = []
const animationAssetKeys = ['referenceImage', 'previewAsset', 'attackEffectAsset'] as const
for (const entry of ANIMATION_CATALOG) {
  for (const key of animationAssetKeys) {
    const value = entry[key]
    if (value) urls.push([entry.id, key, value])
  }
}
for (const entry of EFFECT_CATALOG) if (entry.remnantAsset) urls.push([entry.id, 'remnantAsset', entry.remnantAsset])
for (const definition of [...Object.values(ENEMY_TYPES), ...Object.values(TOWER_TYPE_BY_ID), ...Object.values(ALL_TOWER_TYPE_BY_ID), ...Object.values(BOSS_TYPES)]) {
  if (definition.image) urls.push([definition.id, 'image', definition.image])
}
const missing = []
for (const [id, key, url] of urls) {
  const clean = url.split('?')[0].replace(/^\//, '')
  const assetPath = path.join('public', clean)
  if (!fs.existsSync(assetPath)) missing.push({ id, key, url, assetPath })
}
console.log(JSON.stringify({ checked: urls.length, missing }, null, 2))
console.log('animation available/planned', ANIMATION_CATALOG.filter((entry) => entry.status === 'available').length, ANIMATION_CATALOG.filter((entry) => entry.status === 'planned').length)
console.log('planned ids', ANIMATION_CATALOG.filter((entry) => entry.status === 'planned').map((entry) => entry.id).join(','))
