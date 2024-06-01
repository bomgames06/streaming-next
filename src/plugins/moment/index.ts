import moment from 'moment'
import momentDurationFormatSetup from 'moment-duration-format'
import '@/locales/moment/pt-BR'
import type { Plugin } from 'vue'

const momentPlugin: Plugin = {
  install() {
    momentDurationFormatSetup(moment as never)
  },
}

export default momentPlugin
