import type { Plugin } from 'vue'
import { onResponseError as onTwitchResponseError } from '@/services/api/twitch/events/twitchApiEvent'
import { onResponseError as onYoutubeResponseError } from '@/services/api/youtube/events/youtubeApiEvent'
import { onResponseError as onKickResponseError } from '@/services/api/kick/events/kickApiEvent'
import { HttpStatusCode, isAxiosError } from 'axios'
import useSystemStore from '@/store/system/useSystemStore'

const apiPlugin: Plugin = {
  install() {
    const invalidAccount = (error: unknown) => {
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
    }
    onTwitchResponseError(invalidAccount)
    onYoutubeResponseError(invalidAccount)
    onKickResponseError(invalidAccount)
  },
}

export default apiPlugin
