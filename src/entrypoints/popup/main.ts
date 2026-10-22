import '@/main.scss'
import Popup from '@/pages/Popup.vue'
import registerPlugins from '@/plugins'

const app = createApp(Popup)

registerPlugins(app)

app.mount('body')
