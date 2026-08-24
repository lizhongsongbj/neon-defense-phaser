import Phaser from 'phaser'
import './styles/theme.css'
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
 * App shell —— 对应原版 index.html 里 title-screen/command-center/scene 三段式导航,
 * 只是这里的"scene(战场)"部分由 Phaser 渲染,菜单与 HUD 仍是 HTML+CSS,
 * 两者通过固定 1280x800 的 #stage 共享同一套坐标系,靠 EventBus 通信。
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
  (mapIndex, difficulty) => {
    campaign.difficulty = difficulty
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
EventBus.on(GameEvents.AssetsReady, () => commandCenterUI.markAssetsReady())

EventBus.on(GameEvents.ReturnToCommandCenter, () => {
  gameRoot.hidden = true
  commandCenterUI.show()
})

if ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) {
  const commandTabs = document.querySelector('.command-tabs')
  if (commandTabs) {
    const studioLink = document.createElement('a')
    studioLink.className = 'command-tab command-tab-link'
    studioLink.href = '/image-studio.html'
    studioLink.target = '_blank'
    studioLink.rel = 'noreferrer'
    studioLink.textContent = '素材生图'
    studioLink.setAttribute('aria-label', '打开第四级塔楼生图工作台')
    commandTabs.append(studioLink)
  }
}


installWebGameGuards()
signalWebGameReady()
