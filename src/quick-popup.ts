import '@/main-quick-popup.scss'
import registerPlugins from '@/plugins'
import QuickPopup from '@/pages/QuickPopup.vue'

document.querySelector('#quick-popup')?.remove()

const divMain = document.createElement('div')
divMain.id = 'quick-popup'
document.body.append(divMain)

const app = createApp(QuickPopup)

app.onUnmount(() => {
  divMain.remove()
})

registerPlugins(app, true)

app.mount('#quick-popup')
