import './styles/theme.css'
import './styles/ui-polish.css'
import { CampaignState } from './state/CampaignState'
import { BalancePanel } from './ui/BalancePanel'

const campaign = CampaignState.loadOrCreate()
const panel = new BalancePanel(campaign, () => 0)
panel.onTabActivated()
