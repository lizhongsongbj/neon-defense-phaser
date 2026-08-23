import Phaser from 'phaser'
import './styles/theme.css'
import { gameConfig, GAME_WIDTH, GAME_HEIGHT } from './config/gameConfig'
import { CampaignState, REGISTRY_KEY } from './state/CampaignState'
import { EventBus, GameEvents } from './state/EventBus'
import { TitleScreen } from './ui/TitleScreen'
import { CommandCenterUI } from './ui/CommandCenterUI'
import { BattleHud } from './ui/BattleHud'
import { AutoDemo } from './ui/AutoDemo'

/**
 * App shell —— 对应原版 index.html 里 title-screen/command-center/scene 三段式导航,
 * 只是这里的"scene(战场)"部分由 Phaser 渲染,菜单与 HUD 仍是 HTML+CSS,
 * 两者通过固定 1280x800 的 #stage 共享同一套坐标系,靠 EventBus 通信。
 */
const campaign = CampaignState.loadOrCreate()

const game = new Phaser.Game(gameConfig)
game.registry.set(REGISTRY_KEY, campaign)

const gameRoot = document.getElementById('game-root') as HTMLElement
const stage = document.getElementById('stage') as HTMLElement

function applyStageScale() {
  const scale = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)
  stage.style.transform = `scale(${scale})`
}
applyStageScale()
window.addEventListener('resize', applyStageScale)

const battleHud = new BattleHud(game)
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
