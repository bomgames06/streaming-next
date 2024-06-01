import toastr from 'toastr'
import type { Plugin } from 'vue'

const toastrPlugin: Plugin = {
  install() {
    toastr.options.progressBar = true
    toastr.options.timeOut = 3000
    toastr.options.extendedTimeOut = 3000
    toastr.options.target = '#toastr-content'
  },
}

export default toastrPlugin
