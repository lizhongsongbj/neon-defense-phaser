import Phaser from 'phaser'
import './styles/theme.css'
import './styles/ui-polish.css'
import './styles/hacker-pulse.css'
import { gameConfig, GAME_WIDTH, GAME_HEIGHT } from './config/gameConfig'
import { CampaignState, REGISTRY_KEY } from './state/CampaignState'
import { EventBus, GameEvents } from './state/EventBus'
import { TitleScreen } from './ui/TitleScreen'
import { CommandCenterUI } from './ui/CommandCenterUI'
import { BattleHud } from './ui/BattleHud'
import { AutoDemo } from './ui/AutoDemo'
import { installWebGameGuards, signalWebGameReady } from './platform/WebPlatform'
import { AchievementSystem } from './systems/AchievementSystem'
import { AchievementPanel } from './ui/AchievementPanel'

/**
 * App shell 鈥斺€?瀵瑰簲鍘熺増 index.html 閲?title-screen/command-center/scene 涓夋寮忓鑸?
 * 鍙槸杩欓噷鐨?scene(鎴樺満)"閮ㄥ垎鐢?Phaser 娓叉煋,鑿滃崟涓?HUD 浠嶆槸 HTML+CSS,
 * 涓よ€呴€氳繃鍥哄畾 1280x800 鐨?#stage 鍏变韩鍚屼竴濂楀潗鏍囩郴,闈?EventBus 閫氫俊銆?
 */
const campaign = CampaignState.loadOrCreate()
const achievementSystem = new AchievementSystem()

const game = new Phaser.Game(gameConfig)
game.registry.set(REGISTRY_KEY, campaign)

const gameRoot = document.getElementById('game-root') as HTMLElement
const stage = document.getElementById('stage') as HTMLElement

function applyStageScale() {
  const viewport = window.visualViewport
  const viewportWidth = viewport?.width ?? window.innerWidth
  const viewportHeight = viewport?.height ?? window.innerHeight
  const scale = Math.min(1.25, viewportWidth / GAME_WIDTH, viewportHeight / GAME_HEIGHT)
  stage.style.transform = `scale(${Math.max(0.1, scale)})`
}
applyStageScale()
window.addEventListener('resize', applyStageScale)
window.visualViewport?.addEventListener('resize', applyStageScale)

const battleHud = new BattleHud(game)
new AchievementPanel(achievementSystem)
const autoDemo = new AutoDemo(campaign, game)

const commandCenterUI = new CommandCenterUI(
  campaign,
  game,
  (mapIndex, difficulty, towerIds) => {
    campaign.difficulty = difficulty
    campaign.setTowerLoadout(towerIds)
    campaign.startMission(mapIndex)
    commandCenterUI.hide()
    gameRoot.hidden = false
    applyStageScale()
    battleHud.reset()
    autoDemo.reset()
    game.scene.start('Battle')
  },
  () => {
    commandCenterUI.hide()
    titleScreen.show()
  },
)

const titleScreen = new TitleScreen(() => {
  titleScreen.hide()
  commandCenterUI.show()
})

if (game.registry.get('assetsReady')) commandCenterUI.markAssetsReady()
EventBus.on(GameEvents.AssetsReady, () => {
  commandCenterUI.markAssetsReady()
  const music = game.registry.get('musicController') as { startMenu?: () => void } | undefined
  music?.startMenu?.()
})

EventBus.on(GameEvents.ReturnToCommandCenter, () => {
  gameRoot.hidden = true
  const music = game.registry.get('musicController') as { startMenu?: () => void } | undefined
  music?.startMenu?.()
  commandCenterUI.show()
})

installWebGameGuards()
signalWebGameReady()
