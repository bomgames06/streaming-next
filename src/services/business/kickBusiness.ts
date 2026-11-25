import KickApi from '@/services/api/kick/kickApi'
import type { AccountTokenType, AuthenticatedType, User } from '@/types/userType'
import type { AuthBackgroundMessageType, RevokeBackgroundMessageType } from '@/background/types/backgroundMessageType'
import { browser } from 'wxt/browser'
import type { StreamItemLiveOnlineType, StreamItemLiveStreamType } from '@/components/listStream/types/streamItemType'
import moment from 'moment'
import type { KickApiChannelType, KickApiUserType } from '@/services/api/kick/types/kickApiType'
import type { StorageSyncTypes } from '@/types/syncStorageKeysTypes'
import { STORAGE_KEY_KICK_CHANNELS } from '@/types/syncStorageKeysTypes'

export type KickLivesFollowed = {
  streams: StreamItemLiveStreamType[]
  onlines: StreamItemLiveOnlineType[]
}

function kickChannelToStream(channel: KickApiChannelType, user?: KickApiUserType): StreamItemLiveStreamType {
  return {
    type: 'kick',
    status: 'stream',
    id: String(channel.broadcaster_user_id),
    login: channel.slug,
    name: user?.name ?? channel.slug,
    profileImage: user?.profile_picture || undefined,
    verified: false,
  }
}
function kickChannelToStreamOnline(channel: KickApiChannelType, user?: KickApiUserType): StreamItemLiveOnlineType {
  const image = channel.stream?.thumbnail
  return {
    type: 'kick',
    status: 'online',
    id: String(channel.broadcaster_user_id),
    login: channel.slug,
    name: user?.name ?? channel.slug,
    title: channel.stream_title,
    viewerCount: channel.stream?.viewer_count,
    // Only the category name, the categories view only knows the Twitch ones
    game: channel.category?.name || undefined,
    startedAt: moment(channel.stream?.start_time || undefined),
    previewImage: image
      ? (_width, _height, dump) => (dump ? `${image}${image.includes('?') ? '&' : '?'}dump=${dump}` : image)
      : undefined,
    verified: false,
  }
}

/** Slug of a channel name or url, like "https://kick.com/Some_Name/" */
export function kickSlugOf(value: string): string {
  return value
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?kick\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .toLowerCase()
}

/**
 * The Kick API has no list of the followed channels, so they are the slugs the user added (sync storage
 * `kickChannels`).
 */
const KickBusiness = {
  async auth(): Promise<AuthenticatedType> {
    const message: AuthBackgroundMessageType = { type: 'auth', authType: 'kick' }
    const { token, expiresAt, refreshToken }: AccountTokenType = await browser.runtime.sendMessage(message)
    const user = await this.getSelfUser(token)

    return { token, user, expiresAt, refreshToken }
  },
  async revoke(token: string) {
    const message: RevokeBackgroundMessageType = {
      type: 'revoke',
      authType: 'kick',
      token,
    }
    await browser.runtime.sendMessage(message)
  },
  async getSelfUser(token: string): Promise<User> {
    const [user, channel] = await Promise.all([KickApi.users.self(token), KickApi.channels.self(token)])

    return {
      type: 'kick',
      id: String(user?.user_id ?? channel?.broadcaster_user_id ?? ''),
      name: user?.name ?? channel?.slug ?? 'Kick',
      login: channel?.slug ?? '',
      avatarUrl: user?.profile_picture || undefined,
    }
  },
  async getChannelSlugs(): Promise<string[]> {
    const storage = (await browser.storage.sync.get(STORAGE_KEY_KICK_CHANNELS)) as Partial<StorageSyncTypes>
    return storage[STORAGE_KEY_KICK_CHANNELS] ?? []
  },
  /** Channels of the slugs with their lives, both come from the same request. Unknown slugs are ignored */
  async getChannels(token: string, slugs: string[]): Promise<KickLivesFollowed> {
    if (!slugs.length) return { streams: [], onlines: [] }

    const channels = await KickApi.channels.bySlugs(token, slugs)
    const users = channels.length
      ? await KickApi.users.byIds(
          token,
          channels.map((value) => value.broadcaster_user_id)
        )
      : []
    const userOf = (channel: KickApiChannelType) => users.find((value) => value.user_id === channel.broadcaster_user_id)

    return {
      streams: channels.map((value) => kickChannelToStream(value, userOf(value))),
      onlines: channels
        .filter((value) => value.stream?.is_live)
        .map((value) => kickChannelToStreamOnline(value, userOf(value))),
    }
  },
  async getLivesFollowed(token: string): Promise<KickLivesFollowed> {
    return this.getChannels(token, await this.getChannelSlugs())
  },
  async getStreamersFollowed(token: string): Promise<StreamItemLiveStreamType[]> {
    return (await this.getLivesFollowed(token)).streams
  },
  /** Undefined when there is no channel with the slug */
  async getChannelBySlug(token: string, slug: string): Promise<StreamItemLiveStreamType | undefined> {
    const { streams } = await this.getChannels(token, [slug])
    return streams.find((value) => value.login === slug) ?? streams[0]
  },
}

export default KickBusiness
