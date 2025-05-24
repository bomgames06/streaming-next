import type { App } from 'vue'
import i18n from '@/plugins/i18n'
import pinia from '@/plugins/pinia'
import momentPlugin from '@/plugins/moment'
import vuetify from '@/plugins/vuetify'
import toastrPlugin from '@/plugins/toastr'
import errorPlugin from '@/plugins/error'
import apiPlugin from '@/plugins/api'

function registerPlugins(app: App, quickPopup?: boolean) {
  app.use(apiPlugin)
  app.use(i18n)
  app.use(momentPlugin)
  app.use(toastrPlugin)
  app.use(pinia)
  app.use(vuetify(quickPopup))
  app.use(errorPlugin)
}

export default registerPlugins
