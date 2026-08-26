export type UnitVisualId = 'merc-shield' | 'merc-rifle' | 'merc-blade' | 'drone-scout' | 'drone-bomber' | 'drone-queen'
export type UnitMotion = 'walk' | 'attack' | 'fly' | 'bomb' | 'death'

export const UNIT_RUNTIME_MOTIONS: Readonly<Record<UnitVisualId, readonly UnitMotion[]>> = {
  'merc-shield': ['walk', 'attack', 'death'],
  'merc-rifle': ['walk', 'attack', 'death'],
  'merc-blade': ['walk', 'attack', 'death'],
  'drone-scout': ['fly', 'bomb', 'death'],
  'drone-bomber': ['fly', 'bomb', 'death'],
  'drone-queen': ['fly', 'bomb', 'death'],
}

export const UNIT_RUNTIME_FRAMES = 6

export function unitAnimationFrameKey(id: UnitVisualId, motion: UnitMotion, frame: number) {
  return `unit-animation-${id}-${motion}-${String(frame).padStart(2, '0')}`
}

export function unitAnimationKey(id: UnitVisualId, motion: UnitMotion) {
  return `unit-animation-${id}-${motion}`
}
