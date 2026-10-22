import '@/main.scss'
import './quick-dialog.scss'
import QuickDialog from '@/pages/QuickDialog.vue'
import registerPlugins from '@/plugins'

const app = createApp(QuickDialog)

registerPlugins(app)

app.mount('body')
