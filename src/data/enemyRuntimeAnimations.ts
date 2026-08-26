export type EnemyAnimationMotion = 'move' | 'attack' | 'death'

export interface EnemyRuntimeAnimationSpec {
  source: string
  frames: number
  frameRate: number
  repeat: number
}

export type EnemyRuntimeAnimationSet = Partial<Record<EnemyAnimationMotion, EnemyRuntimeAnimationSpec>>

export const ENEMY_RUNTIME_ANIMATIONS: Record<string, EnemyRuntimeAnimationSet> = {
  enforcer: {
    move: { source: 'boss-adam-smasher-move.webp', frames: 8, frameRate: 9, repeat: -1 },
    attack: { source: 'boss-adam-smasher-attack.webp', frames: 8, frameRate: 8, repeat: -1 },
    death: { source: 'boss-adam-smasher-death.webp', frames: 8, frameRate: 7, repeat: 0 },
  },
  gang: {
    move: { source: 'enemy-01-gang-cyborg-side45-move-fixed-size.webp', frames: 8, frameRate: 10, repeat: -1 },
    death: { source: 'enemy-01-gang-cyborg-death-kneel-8f.webp', frames: 8, frameRate: 8, repeat: 0 },
  },
  riot: {
    move: { source: 'enemy-02-riot-mech-move-fixed-size.webp', frames: 8, frameRate: 8, repeat: -1 },
    attack: { source: 'enemy-02-riot-mech-attack.webp', frames: 8, frameRate: 9, repeat: -1 },
    death: { source: 'enemy-02-riot-mech-death.webp', frames: 8, frameRate: 8, repeat: 0 },
  },
  ninja: {
    move: { source: 'enemy-03-phase-ninja-move-fixed-size.webp', frames: 8, frameRate: 12, repeat: -1 },
    attack: { source: 'enemy-03-phase-ninja-attack.webp', frames: 8, frameRate: 13, repeat: -1 },
    death: { source: 'enemy-03-phase-ninja-death-transparent.webp', frames: 8, frameRate: 8, repeat: 0 },
  },
  aerostat: {
    move: { source: 'enemy-04-corporate-airship-fly.webp', frames: 12, frameRate: 15, repeat: -1 },
    attack: { source: 'enemy-04-corporate-airship-attack-generated.webp', frames: 12, frameRate: 12, repeat: -1 },
    death: { source: 'enemy-04-corporate-airship-death-generated.webp', frames: 12, frameRate: 9, repeat: 0 },
  },
  devourer: {
    move: { source: 'enemy-05-data-devourer-move.webp', frames: 12, frameRate: 15, repeat: -1 },
    attack: { source: 'enemy-05-data-devourer-attack-generated.webp', frames: 12, frameRate: 12, repeat: -1 },
    death: { source: 'enemy-05-data-devourer-death-generated.webp', frames: 12, frameRate: 9, repeat: 0 },
  },
  faraday: {
    move: { source: 'enemy-06-electromagnetic-riot-move.webp', frames: 8, frameRate: 8, repeat: -1 },
    attack: { source: 'enemy-06-electromagnetic-riot-attack-generated.webp', frames: 8, frameRate: 10, repeat: -1 },
    death: { source: 'enemy-06-electromagnetic-riot-death-generated.webp', frames: 8, frameRate: 8, repeat: 0 },
  },
  hijacker: {
    move: { source: 'enemy-07-hijack-hovercraft-fly.webp', frames: 12, frameRate: 15, repeat: -1 },
    attack: { source: 'enemy-07-hijack-hovercraft-attack-generated.webp', frames: 12, frameRate: 12, repeat: -1 },
    death: { source: 'enemy-07-hijack-hovercraft-death-generated.webp', frames: 12, frameRate: 9, repeat: 0 },
  },
  neurohound: {
    move: { source: 'enemy-08-neuro-hound-move.webp', frames: 8, frameRate: 13, repeat: -1 },
    attack: { source: 'enemy-08-neuro-hound-attack.webp', frames: 14, frameRate: 12, repeat: -1 },
    death: { source: 'enemy-08-neuro-hound-death.webp', frames: 12, frameRate: 8, repeat: 0 },
  },
  matriarch: {
    move: { source: 'enemy-09-tissue-matriarch-move.webp', frames: 14, frameRate: 13, repeat: -1 },
    attack: { source: 'enemy-09-tissue-matriarch-attack.webp', frames: 14, frameRate: 12, repeat: -1 },
    death: { source: 'enemy-09-tissue-matriarch-death.webp', frames: 12, frameRate: 8, repeat: 0 },
  },
  bonebreaker: {
    move: { source: 'enemy-10-bonebreaker-move.webp', frames: 8, frameRate: 8, repeat: -1 },
    attack: { source: 'enemy-10-bonebreaker-attack.webp', frames: 14, frameRate: 12, repeat: -1 },
    death: { source: 'enemy-10-bonebreaker-death.webp', frames: 12, frameRate: 8, repeat: 0 },
  },
}

export function enemyAnimationTextureKey(typeId: string, motion: EnemyAnimationMotion, frame: number) {
  return `enemy-animation-${typeId}-${motion}-${String(frame).padStart(2, '0')}`
}

export function enemyAnimationKey(typeId: string, motion: EnemyAnimationMotion) {
  return `enemy-animation-${typeId}-${motion}`
}

export function enemyAnimationFramePath(typeId: string, motion: EnemyAnimationMotion, frame: number) {
  const cleanDeath = motion === 'death' && ['aerostat', 'devourer', 'faraday', 'hijacker'].includes(typeId)
  const root = cleanDeath ? 'runtime-clean-v2' : 'runtime'
  return `assets/animations/enemies/${root}/${typeId}/${motion}/frame-${String(frame).padStart(2, '0')}.webp`
}


