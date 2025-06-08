import type { User } from '@/types/userType'
import type {
  AuthBackgroundMessageType,
  GetAccessTokenChromeBackgroundMessageType,
  RevokeBackgroundMessageType,
} from '@/background/types/backgroundMessageType'
import browser from 'webextension-polyfill'
import YoutubeApi from '@/services/api/youtube/youtubeApi.ts'
import { maxBy } from 'lodash'
import type { StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType.ts'
import useSystemStore from '@/store/system/useSystemStore.ts'

async function fetchAccessToken(): Promise<string> {
  const message: GetAccessTokenChromeBackgroundMessageType = {
    type: 'getAccessTokenChrome',
  }

  try {
    return (await browser.runtime.sendMessage(message)) as string
  } catch (e) {
    const system = useSystemStore()
    system.invalidAccountByAccountType('youtube')
    throw e
  }
}

const TwitchBusiness = {
  async auth(forceVerify?: boolean, interactive?: boolean): Promise<{ token: string; user: User }> {
    const message: AuthBackgroundMessageType = {
      type: 'auth',
      authType: 'youtube',
      forceVerify,
      interactive,
    }
    const accessToken: string = await browser.runtime.sendMessage(message)
    const user = await this.getSelfUser()

    return { token: accessToken, user }
  },
  async revoke(token: string) {
    const message: RevokeBackgroundMessageType = {
      type: 'revoke',
      authType: 'youtube',
      token,
    }
    await browser.runtime.sendMessage(message)
  },
  async getSelfUser(): Promise<User> {
    const response = await YoutubeApi.channels.list(await fetchAccessToken(), {
      part: ['snippet'],
      mine: true,
    })
    const item = response.items[0]
    if (!item) throw new Error('No channel found')

    return {
      type: 'youtube',
      id: item.id,
      name: item.snippet.title,
      login: item.snippet.customUrl,
      avatarUrl: maxBy(Object.values(item.snippet.thumbnails), 'width')?.url,
    }
  },

  async getStreamersFollowed(): Promise<StreamItemLiveStreamType[]> {
    const token = await fetchAccessToken()

    const users = await YoutubeApi.subscriptions.allList(token, {
      part: ['snippet'],
      mine: true,
    })

    const streamers: StreamItemLiveStreamType[] = users.map((value) => {
      const thumbnails = Object.values(value.snippet.thumbnails)

      return {
        type: 'youtube',
        status: 'stream',
        id: value.id,
        login: value.snippet.resourceId.channelId,
        name: value.snippet.title,
        profileImage: thumbnails[maxBy([thumbnails.length - 1, 0]) ?? 0].url,
        verified: false,
      }
    })

    const system = useSystemStore()
    system.setAccountCacheStreams('youtube', streamers)

    return streamers
  },
}

export default TwitchBusiness
