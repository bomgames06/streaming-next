import type { Plugin } from 'vue'
import i18n from '@/plugins/i18n'
import { HttpStatusCode, isAxiosError } from 'axios'
import toastr from 'toastr'

const errorPlugin: Plugin = {
  install(vue) {
    vue.config.errorHandler = (err) => {
      if (isAxiosError(err)) {
        if (err.response?.status === HttpStatusCode.Unauthorized) {
          toastr.error(i18n.global.t('common.unauthorizedAccount'))
          throw err
        }
      }
      toastr.error(i18n.global.t('common.systemError'))
      throw err
    }
  },
}

export default errorPlugin
