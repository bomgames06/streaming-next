import type {
  AccountStore,
  AccountStoreType,
  ClipPeriodStore,
  LanguageCategoryStreamStore,
  VideoOrderStore,
} from '@/store/system/types/systemStoreType'
import type { User } from '@/types/userType'
import TwitchBusiness from '@/services/business/twitchBusiness'
import type {
  StreamItemClipType,
  StreamItemLiveOnlineType,
  StreamItemLiveType,
  StreamItemVideoType,
} from '@/components/listStream/types/streamItemType'
import type { CategoryItemType } from '@/components/listCategories/types/categoryItemType'

async function handlerAccounts<T>(
  type: AccountStoreType,
  handler: { [key in AccountStoreType]?: () => Promise<T> }
): Promise<T> {
  if (type === 'twitch' && handler['twitch']) return handler['twitch']()
  else throw new Error('Type is undefined')
}

const AppBusiness = {
  async auth(type: AccountStoreType, forceVerify?: boolean): Promise<{ token: string; user: User }> {
    return handlerAccounts(type, {
      twitch: async () => TwitchBusiness.auth(forceVerify),
    })
  },
  async revoke(type: AccountStoreType, token: string): Promise<void> {
    return handlerAccounts(type, {
      twitch: async () => TwitchBusiness.revoke(token),
    })
  },
  async getSelfUser(token: string, type: AccountStoreType): Promise<User> {
    return handlerAccounts(type, {
      twitch: async () => TwitchBusiness.getSelfUser(token),
    })
  },
  async getUserVideosArchive(
    account: AccountStore,
    userId: string,
    videoOrder?: VideoOrderStore,
    cursor?: string,
    limit?: number
  ): Promise<{ items: StreamItemVideoType[]; cursor?: string }> {
    return handlerAccounts(account.type, {
      twitch: async () => TwitchBusiness.getUserVideosArchive(account.token, userId, videoOrder, cursor, limit),
    })
  },
  async getUserClips(
    account: AccountStore,
    userId: string,
    period?: ClipPeriodStore,
    cursor?: string,
    limit?: number
  ): Promise<{ items: StreamItemClipType[]; cursor?: string }> {
    return handlerAccounts(account.type, {
      twitch: async () => TwitchBusiness.getUserClips(account.token, userId, period, cursor, limit),
    })
  },
  async getTopGamesCategory(
    account: AccountStore,
    cursor?: string,
    limit?: number
  ): Promise<{ items: CategoryItemType[]; cursor?: string }> {
    return handlerAccounts(account.type, {
      twitch: async () => TwitchBusiness.getTopGamesCategory(account.token, cursor, limit),
    })
  },
  async getStreamsByCategory(
    account: AccountStore,
    categoryId: string,
    language?: LanguageCategoryStreamStore,
    cursor?: string,
    limit?: number
  ): Promise<{ items: StreamItemLiveOnlineType[]; cursor?: string }> {
    return handlerAccounts(account.type, {
      twitch: async () => TwitchBusiness.getStreamsByCategory(account.token, categoryId, language, cursor, limit),
    })
  },
  async getCategoryById(account: AccountStore, categoryId: string): Promise<CategoryItemType[]> {
    return handlerAccounts(account.type, {
      twitch: async () => TwitchBusiness.getCategoryById(account.token, categoryId),
    })
  },
  async searchChannels(
    account: AccountStore,
    query: string,
    cursor?: string,
    limit?: number
  ): Promise<{ items: StreamItemLiveType[]; cursor?: string }> {
    return handlerAccounts(account.type, {
      twitch: async () => TwitchBusiness.searchChannels(account.token, query, cursor, limit),
    })
  },
}

export default AppBusiness
