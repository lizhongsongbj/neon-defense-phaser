import fs from 'node:fs'
let s=fs.readFileSync('index.html','utf8').replace(/^\uFEFF/,'')
const tab='<button class="command-tab" type="button" role="tab" data-command-tab="balance" aria-selected="false">数值测试</button>'
if(!s.includes('data-command-tab="animations"')) s=s.replace(tab,tab+'\n          <button class="command-tab" type="button" role="tab" data-command-tab="animations" aria-selected="false">动画面板</button>')
const marker='    <!-- 战场:Phaser 画布 + HUD 覆盖层,对应原版 #board / .topbar / .wave-console / .player-status 等 -->'
if(!s.includes('data-command-panel="animations"')){
 const pos=s.indexOf(marker); if(pos<0) throw new Error('marker missing')
 const close='    </section>\n\n'; const closePos=s.lastIndexOf(close,pos); if(closePos<0) throw new Error('close missing')
 const panel=`      <section class="command-panel animation-panel" data-command-panel="animations" aria-label="游戏动画面板" hidden>
        <header class="animation-panel__header">
          <div><span>ANIMATION MATRIX // COMPLETE MOTION LIBRARY</span><h2>全单位动画面板</h2><p>收录八种防御塔全部等级攻击、全部怪物行走/攻击/死亡、佣兵和无人机单位动作，以及系统与连携特效。</p></div>
          <output id="animation-count">正在建立动画索引…</output>
        </header>
        <div class="animation-toolbar">
          <div class="animation-filters" role="group" aria-label="动画分类">
            <button type="button" data-animation-filter="all" aria-pressed="true">全部</button><button type="button" data-animation-filter="tower" aria-pressed="false">防御塔攻击</button><button type="button" data-animation-filter="enemy" aria-pressed="false">怪物</button><button type="button" data-animation-filter="mercenary" aria-pressed="false">佣兵</button><button type="button" data-animation-filter="drone" aria-pressed="false">无人机</button><button type="button" data-animation-filter="system" aria-pressed="false">系统/连携</button>
          </div>
          <label class="animation-search"><span>SEARCH</span><input id="animation-search" type="search" placeholder="搜索名称、等级或动作…" autocomplete="off" /></label>
        </div>
        <div class="animation-grid" id="animation-grid"></div>
        <aside class="animation-detail" id="animation-detail" hidden><div class="animation-detail__panel">
          <button class="picker-close animation-detail__close" id="animation-detail-close" type="button" aria-label="关闭动画详情">×</button>
          <div class="animation-detail__preview" id="animation-detail-preview"></div>
          <div class="animation-detail__copy"><span id="animation-detail-code"></span><h3 id="animation-detail-name"></h3><p id="animation-detail-description"></p><dl><div><dt>动作时间线</dt><dd id="animation-detail-timeline"></dd></div><div><dt>素材状态</dt><dd id="animation-detail-status"></dd></div></dl><button class="animation-replay" id="animation-replay" type="button">REPLAY // 重新播放</button></div>
        </div></aside>
      </section>
`
 s=s.slice(0,closePos)+panel+s.slice(closePos)
}
fs.writeFileSync('index.html',s,'utf8')

s=fs.readFileSync('src/ui/CommandCenterUI.ts','utf8').replace(/^\uFEFF/,'')
if(!s.includes("./AnimationPanel")) s=s.replace("import { BalancePanel } from './BalancePanel'", "import { BalancePanel } from './BalancePanel'\nimport { AnimationPanel } from './AnimationPanel'")
if(!s.includes('private readonly animationPanel')) s=s.replace('  private readonly balancePanel: BalancePanel','  private readonly balancePanel: BalancePanel\n  private readonly animationPanel: AnimationPanel')
if(!s.includes("data-command-panel=\"animations\"")) s=s.replace("      balance: this.el.querySelector('[data-command-panel=\"balance\"]') as HTMLElement,", "      balance: this.el.querySelector('[data-command-panel=\"balance\"]') as HTMLElement,\n      animations: this.el.querySelector('[data-command-panel=\"animations\"]') as HTMLElement,")
if(!s.includes('this.animationPanel = new AnimationPanel')) s=s.replace('    this.balancePanel = new BalancePanel(campaign, () => this.selectedMapIndex)','    this.balancePanel = new BalancePanel(campaign, () => this.selectedMapIndex)\n    this.animationPanel = new AnimationPanel()')
if(!s.includes("target === 'animations'")) s=s.replace("        if (target === 'balance') this.balancePanel.onTabActivated()", "        if (target === 'balance') this.balancePanel.onTabActivated()\n        if (target === 'animations') this.animationPanel.activate()")
fs.writeFileSync('src/ui/CommandCenterUI.ts',s,'utf8')
