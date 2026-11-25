import useSystemStore from '@/store/system/useSystemStore'
import YoutubeBusiness from '@/services/business/youtubeBusiness'
import type {
  StreamItemLiveOnlineType,
  StreamItemLiveStreamType,
  StreamItemLiveUpcomingType,
} from '@/components/listStream/types/streamItemType'

/**
 * Followed YouTube channels with their lives and upcoming lives, shared by the views that list streams.
 * Not forced fetches use the YouTube caches, its API quota is small.
 */
export default function useYoutubeLives() {
  const system = useSystemStore()

  const youtubeStreams = ref<StreamItemLiveStreamType[]>([])
  const youtubeOnlines = ref<StreamItemLiveOnlineType[]>([])
  const upcomings = ref<StreamItemLiveUpcomingType[]>([])
  const youtubeMissingPermission = ref<boolean>(false)

  async function fetchYoutube(force?: boolean): Promise<void> {
    system.loading()
    try {
      const account = system.accounts.youtube
      if (account) await system.renewAccountToken(account)
      if (!account || account.invalid) {
        youtubeStreams.value = []
        youtubeOnlines.value = []
        upcomings.value = []
        youtubeMissingPermission.value = false
        return
      }

      youtubeStreams.value = system.accountsCacheStreams?.youtube || []
      youtubeStreams.value = await system.fetchStreamersFollowed(account)

      const lives = await YoutubeBusiness.getLivesFollowed(
        account.token,
        account.accountId,
        youtubeStreams.value.map((value) => value.id),
        force
      )
      youtubeOnlines.value = lives.onlines
      upcomings.value = lives.upcomings
      youtubeMissingPermission.value = lives.missingPermission
    } finally {
      system.loaded()
    }
  }

  /** Must run on a user click, the browser only shows the permission prompt then */
  async function allowYoutubeFeeds(): Promise<boolean> {
    return YoutubeBusiness.requestFeedPermission()
  }

  return { youtubeStreams, youtubeOnlines, upcomings, youtubeMissingPermission, fetchYoutube, allowYoutubeFeeds }
}
