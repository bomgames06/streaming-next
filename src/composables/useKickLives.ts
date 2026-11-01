import useSystemStore from '@/store/system/useSystemStore'
import KickBusiness from '@/services/business/kickBusiness'
import type { StreamItemLiveOnlineType, StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType'

/**
 * Kick channels added by slug with their lives, shared by the views that list streams. The channels and the lives come
 * from the same request.
 */
export default function useKickLives() {
  const system = useSystemStore()

  const kickStreams = ref<StreamItemLiveStreamType[]>(system.accountsCacheStreams?.kick || [])
  const kickOnlines = ref<StreamItemLiveOnlineType[]>([])

  async function fetchKick(): Promise<void> {
    system.loading()
    try {
      const account = system.accounts.kick
      if (account) await system.renewAccountToken(account)
      if (!account || account.invalid) {
        kickStreams.value = []
        kickOnlines.value = []
        return
      }

      const lives = await KickBusiness.getChannels(account.token, system.kickChannels)
      system.setAccountCacheStreams('kick', lives.streams)
      kickStreams.value = lives.streams
      kickOnlines.value = lives.onlines
    } finally {
      system.loaded()
    }
  }

  return { kickStreams, kickOnlines, fetchKick }
}
