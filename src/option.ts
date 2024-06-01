import '@/main.scss'
import Option from '@/pages/Option.vue'
import { createApp } from 'vue'
import registerPlugins from '@/plugins'

const app = createApp(Option)

registerPlugins(app)

app.mount('body')
