import type { AllTowerId } from './towerExpansion'

export const TOWER_LEVEL_IMAGE: Readonly<Record<AllTowerId, readonly [string, string, string]>> = {
  'mag-rail-sniper': [
    'assets/towers/generated-raw-selected/tower-01-magnetic-rail-base-cutout.png',
    'assets/generated/progression/tier-2/mag-rail-tier-2.png',
    'assets/generated/cutout/mag-rail-tier-3-2026-08-23T11-48-26-946Z.png',
  ],
  'arc-neon': [
    'assets/towers/generated-raw-selected/tower-02-arc-neon-base-cutout-1.png',
    'assets/generated/progression/tier-2/arc-neon-tier-2.png',
    'assets/generated/cutout/arc-neon-tier-3-2026-08-23T11-49-31-954Z.png',
  ],
  'street-mercenary': [
    'assets/towers/generated-raw-selected/tower-03-mercenary-outpost-base-cutout.png',
    'assets/generated/progression/tier-2/mercenary-tier-2.png',
    'assets/generated/cutout/mercenary-tier-3-2026-08-23T11-50-44-749Z.png',
  ],
  'hacker-relay': [
    'assets/towers/generated-raw-selected/tower-04-hacker-relay-base-cutout.png',
    'assets/generated/progression/tier-2/hacker-tier-2.png',
    'assets/generated/cutout/hacker-tier-3-2026-08-23T11-53-44-631Z.png',
  ],
  'drone-hive': [
    'assets/towers/generated-raw-selected/tower-05-drone-hive-base-new-drones.png',
    'assets/generated/progression/tier-2/drone-tier-2.png',
    'assets/generated/cutout/drone-tier-3-2026-08-23T11-55-02-046Z.png',
  ],
  'gravity-nail': [
    'assets/towers/new-concepts/simplified/gravity-nail-level-1.png',
    'assets/towers/new-concepts/simplified/gravity-nail-level-2.png',
    'assets/towers/new-concepts/simplified/gravity-nail-level-3.png',
  ],
  'grey-tide': [
    'assets/towers/new-concepts/revised/grey-tide-level-1.png',
    'assets/towers/new-concepts/revised/grey-tide-level-2.png',
    'assets/towers/new-concepts/revised/grey-tide-level-3.png',
  ],
  'trajectory-rewriter': [
    'assets/towers/new-concepts/revised/trajectory-rewriter-level-1.png',
    'assets/towers/new-concepts/revised/trajectory-rewriter-level-2.png',
    'assets/towers/new-concepts/revised/trajectory-rewriter-level-3.png',
  ],
}

export function towerLevelTextureKey(typeId: AllTowerId, level: number) {
  return `tower-level-${typeId}-${Math.min(3, Math.max(1, level))}`
}

export const TOWER_ATTACK_FRAMES: Readonly<Partial<Record<AllTowerId, number>>> = {
  'mag-rail-sniper': 14,
  'arc-neon': 16,
  'street-mercenary': 16,
  'hacker-relay': 16,
  'drone-hive': 16,
}

export function towerAttackFrameKey(typeId: AllTowerId, frame: number) {
  return `tower-attack-${typeId}-${String(frame).padStart(2, '0')}`
}

export function towerAttackAnimationKey(typeId: AllTowerId) {
  return `tower-attack-${typeId}`
}
