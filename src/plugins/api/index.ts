import type { Plugin } from 'vue'
import { onResponseError } from '@/services/events/tokenApiEvent.ts'
import { HttpStatusCode, isAxiosError } from 'axios'
import useSystemStore from '@/store/system/useSystemStore'

const apiPlugin: Plugin = {
  install() {
    onResponseError((error) => {
      if (isAxiosError(error)) {
        if (error.response?.status === HttpStatusCode.Unauthorized) {
          try {
            const system = useSystemStore()
            const token = String(error.config?.headers.Authorization || '').substring('Bearer '.length)
            system.invalidAccountByToken(token)
          } catch {
            throw error
          }
        }
      }
    })
  },
}

export default apiPlugin
