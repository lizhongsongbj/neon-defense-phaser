import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { PreloadScene } from '../scenes/PreloadScene'
import { BattleScene } from '../scenes/BattleScene'

export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 800

/**
 * 主界面/指挥中心/战斗 HUD 现在都是 HTML+CSS(见 src/ui、index.html),
 * Phaser 只负责渲染战场本身,画布挂在固定 1280x800 的 #game-canvas 里,
 * 与 HUD 覆盖层共享 #stage 的坐标系(见 src/styles/theme.css 里的 #stage 说明)。
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-canvas',
  backgroundColor: '#05060a',
  scale: {
    mode: Phaser.Scale.NONE,
  },
  // windowEvents:false 让 Phaser 只在真正点到 canvas 时才处理输入 —— 否则它会用
  // clientX/clientY 命中画布逻辑坐标,即使真正点击目标是叠在画布上方的 HTML 按钮
  // (建塔面板/操作面板等),导致"点 DOM 按钮却触发了画布背景的清空选择"这种串台。
  input: {
    windowEvents: false,
  },
  scene: [BootScene, PreloadScene, BattleScene],
}
