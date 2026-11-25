import AxiosBase from '@/services/base/axiosBase'
import type { YoutubeFeedType } from '@/services/api/youtube/types/youtubeApiType'

// A feed that hangs must not hold the lives of the other channels
const FEED_TIMEOUT = 25 * 1000

// Public RSS feed with the last 15 videos of a channel, it costs no API quota but needs the youtube.com host permission
export default class YoutubeFeedEndpoint extends AxiosBase {
  constructor() {
    super(import.meta.env.VITE_APP_FEED_YOUTUBE_URL)
  }

  async videos(channelId: string): Promise<YoutubeFeedType> {
    const response = await this.axios({ responseType: 'text', timeout: FEED_TIMEOUT }).get<string>('/videos.xml', {
      params: { channel_id: channelId },
    })

    // Parsed with regex because the background service worker has no DOMParser
    const entries = Array.from(response.data.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).flatMap(([, entry]) => {
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1]
      if (!videoId || !published) return []
      return [{ videoId, channelId, published }]
    })

    return { expiresAt: Date.parse(String(response.headers.expires)) || 0, entries }
  }
}
