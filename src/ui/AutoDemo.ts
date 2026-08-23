/**
 * AUTO 演示代理控制器 —— 原样迁移自 霓虹防线/auto-demo.js 里挂在 `window.neonAutoDemo`
 * 上的启停逻辑与 900ms 决策循环。玩家可见功能(战场 HUD 右上角「AUTO 演示」按钮),
 * 不是数值面板/CLI 那类纯开发者工具。
 *
 * 运行期间通过 `campaign.demoActive` 关闭存档持久化,退出时整页刷新即可无痛还原玩家真实存档,
 * 这一机制与原版 `saveGame()` 里 `if (window.neonAutoDemo?.active) return;` 的短路完全一致。
 */
import type Phaser from 'phaser'
import { MAP_LEVELS } from '../data/maps'
import { towerGrowthBonuses } from '../data/balance'
import { TOWER_IDS, TOWER_TYPE_BY_ID } from '../data/towers'
import { buildMapGeometry } from '../systems/PathSystem'
import { chooseBuildAction, chooseUpgradeAction, type DemoBattleSnapshot, type DemoContext } from '../systems/AutoDemoPlanner'
import type { GrowthBonusMap } from '../systems/AutoPilot'
import { EventBus, GameEvents, type BattleHudPayload } from '../state/EventBus'
import { CampaignState, REGISTRY_KEY } from '../state/CampaignState'

/** 战斗中已部署塔位达到这个上限后倾向升级而非新建,原 `5 + floor(max(0, wave-1)/2)` */
function towerCapForWave(wave: number, maxSlots: number): number {
  return Math.min(maxSlots, 5 + Math.floor(Math.max(0, wave - 1) / 2))
}

export class AutoDemo {
  private readonly toggle: HTMLButtonElement
  private readonly status: HTMLOutputElement

  private active = false
  private running = false
  private timer: number | undefined
  private latestHud: BattleHudPayload | null = null

  constructor(private readonly campaign: CampaignState, private readonly game: Phaser.Game) {
    this.toggle = document.getElementById('auto-demo-toggle') as HTMLButtonElement
    this.status = document.getElementById('auto-demo-status') as HTMLOutputElement

    this.toggle.addEventListener('click', () => (this.active ? this.stop() : this.start()))
    EventBus.on(GameEvents.HudUpdate, (payload: BattleHudPayload) => {
      this.latestHud = payload
    })
    EventBus.on(GameEvents.Victory, () => this.active && this.finish('演示完成 // 战区已清除'))
    EventBus.on(GameEvents.GameOver, () => this.active && this.finish('演示结束 // 基地失守'))
    // 演示期间存档持久化被挂起(见 CampaignState.demoActive),经其他路径离开战场时
    // 也要当作退出演示处理,避免玩家真实进度从此再也无法写入 localStorage。
    EventBus.on(GameEvents.ReturnToCommandCenter, () => this.active && this.stop())
  }

  /** 每次重新进入战斗场景时调用,重置代理状态(不影响 toggle 的启动/停止能力) */
  reset() {
    this.latestHud = null
  }

  private setStatus(text: string) {
    this.status.textContent = text
    this.status.dataset.active = String(this.active)
  }

  private syncToggle() {
    this.toggle.setAttribute('aria-pressed', String(this.active))
    this.toggle.textContent = this.active ? '退出演示' : 'AUTO 演示'
  }

  private start() {
    if (this.active) return
    this.active = true
    this.running = true
    this.syncToggle()
    this.setStatus('初始化标准演示战场')
    const mapIndex = this.latestHud?.mapIndex ?? this.campaign.mapIndex
    EventBus.emit(GameEvents.RestartBattle, { mapIndex, difficulty: 'normal' })
    EventBus.emit(GameEvents.SetSpeed, { speed: 3 })
    window.clearInterval(this.timer)
    this.tick()
    this.timer = window.setInterval(() => this.tick(), 900)
  }

  private stop() {
    this.finish('正在恢复玩家存档')
    this.active = false
    this.syncToggle()
    window.setTimeout(() => window.location.reload(), 180)
  }

  private finish(message: string) {
    this.running = false
    window.clearInterval(this.timer)
    this.timer = undefined
    this.setStatus(message)
  }

  private growthBonuses(): GrowthBonusMap {
    return Object.fromEntries(TOWER_IDS.map((id) => [id, towerGrowthBonuses(this.campaign.towerGrowthBonus(id))])) as unknown as GrowthBonusMap
  }

  /** 每 900ms 一次的建造/升级决策 + 波次推进,原 `_0x4216ba` */
  private tick() {
    if (!this.running) return
    const hud = this.latestHud
    if (!hud) {
      this.finish('接口中断 // 退出后重试')
      return
    }
    if (this.attemptInvestment(hud)) return
    if (hud.waveActive) {
      this.setStatus(`自动交战 // WAVE ${String(hud.wave).padStart(2, '0')} // 敌军 ${hud.enemyCount}`)
    } else {
      EventBus.emit(GameEvents.StartNextWave)
      this.setStatus(hud.countdown > 0 ? '提前开启下一波 // 获取奖励' : `发动第 ${hud.wave} 波`)
    }
  }

  /** 尝试建造或升级一个塔位,返回是否执行了动作,原 `_0x1b12e2` */
  private attemptInvestment(hud: BattleHudPayload): boolean {
    const mapLevel = MAP_LEVELS[hud.mapIndex]
    if (!mapLevel) return false
    const geometry = buildMapGeometry(mapLevel)
    const towerCap = towerCapForWave(hud.wave, mapLevel.slots.length)
    if (!hud.waveActive && hud.towers.length >= towerCap) return false

    const reserve = hud.waveActive && hud.towers.length >= towerCap ? 70 : 0
    const snapshot: DemoBattleSnapshot = {
      coins: Math.max(0, hud.coins - reserve),
      towers: hud.towers,
      slots: mapLevel.slots.map((slot, slotIndex) => ({ ...slot, slotIndex })),
    }
    const ctx: DemoContext = {
      mapLevel,
      geometry,
      mapIndex: hud.mapIndex,
      wave: hud.wave,
      growthBonuses: this.growthBonuses(),
    }

    const action = hud.towers.length < towerCap ? chooseBuildAction(snapshot, ctx) : chooseUpgradeAction(snapshot, ctx) ?? chooseBuildAction(snapshot, ctx)
    if (!action) return false

    if (action.kind === 'build') {
      EventBus.emit(GameEvents.BuildTower, { slotIndex: action.slotIndex, typeId: action.typeId })
      this.setStatus(`建造 ${TOWER_TYPE_BY_ID[action.typeId].name} // 塔位 ${action.slotIndex + 1}`)
    } else {
      EventBus.emit(GameEvents.UpgradeTower, { towerId: `t${action.slotIndex}` })
      this.setStatus(`升级 ${TOWER_TYPE_BY_ID[action.typeId].name} // LV.${action.level + 1}`)
    }
    return true
  }
}

export function createAutoDemo(game: Phaser.Game): AutoDemo {
  const campaign = game.registry.get(REGISTRY_KEY) as CampaignState
  return new AutoDemo(campaign, game)
}
