import { ANIMATION_CATALOG } from '../src/data/animationCatalog.ts'
import { EFFECT_CATALOG } from '../src/data/effectCatalog.ts'
import { ENEMY_TYPES } from '../src/data/enemies.ts'
import { TOWER_TYPE_BY_ID } from '../src/data/towers.ts'
import { ALL_TOWER_TYPE_BY_ID } from '../src/data/towerExpansion.ts'
import { BOSS_TYPES } from '../src/data/bosses.ts'
import fs from 'node:fs'
import path from 'node:path'
const urls=[]; for(const e of ANIMATION_CATALOG){for(const k of ['referenceImage','previewAsset','attackEffectAsset']) if(e[k]) urls.push([e.id,k,e[k]])}; for(const e of EFFECT_CATALOG) if(e.remnantAsset) urls.push([e.id,'remnantAsset',e.remnantAsset]); for(const d of [...Object.values(ENEMY_TYPES),...Object.values(TOWER_TYPE_BY_ID),...Object.values(ALL_TOWER_TYPE_BY_ID),...Object.values(BOSS_TYPES)]) if(d.image) urls.push([d.id,'image',d.image])
const missing=[]; for(const [id,k,u] of urls){const clean=u.split('?')[0].replace(/^\//,''); const p=path.join('public',clean); if(!fs.existsSync(p)) missing.push({id,k,u,p})}
console.log(JSON.stringify({checked:urls.length,missing},null,2))
console.log('animation available/planned',ANIMATION_CATALOG.filter(e=>e.status==='available').length,ANIMATION_CATALOG.filter(e=>e.status==='planned').length)
console.log('planned ids',ANIMATION_CATALOG.filter(e=>e.status==='planned').map(e=>e.id).join(','))
