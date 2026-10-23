import { describe, expect, it, vi } from 'vitest'
import AppBusiness from '@/services/business/appBusiness'
import TwitchBusiness from '@/services/business/twitchBusiness'
import type { AccountStore, AccountStoreType } from '@/store/system/types/systemStoreType'
import { account } from '@tests/__utils__/fixtures'

vi.mock('@/services/business/twitchBusiness', () => ({
  default: {
    auth: vi.fn(() => Promise.resolve('auth')),
    revoke: vi.fn(() => Promise.resolve()),
    getSelfUser: vi.fn(() => Promise.resolve('getSelfUser')),
    getStreamersFollowed: vi.fn(() => Promise.resolve('getStreamersFollowed')),
    getUserVideosArchive: vi.fn(() => Promise.resolve('getUserVideosArchive')),
    getUserClips: vi.fn(() => Promise.resolve('getUserClips')),
    getTopGamesCategory: vi.fn(() => Promise.resolve('getTopGamesCategory')),
    getStreamsByCategory: vi.fn(() => Promise.resolve('getStreamsByCategory')),
    getCategoryById: vi.fn(() => Promise.resolve('getCategoryById')),
    searchChannels: vi.fn(() => Promise.resolve('searchChannels')),
    searchCategories: vi.fn(() => Promise.resolve('searchCategories')),
    fetchCategoriesByIds: vi.fn(() => Promise.resolve('fetchCategoriesByIds')),
    fetchCategoriesByNames: vi.fn(() => Promise.resolve('fetchCategoriesByNames')),
  },
}))

const twitchAccount = account()
const unknownAccount = { ...twitchAccount, type: 'unknown' } as unknown as AccountStore

describe('AppBusiness', () => {
  // [AppBusiness call, expected TwitchBusiness call, unknown account call]
  const cases: [string, () => Promise<unknown>, string, unknown[], () => Promise<unknown>][] = [
    [
      'auth',
      () => AppBusiness.auth('twitch', true, false),
      'auth',
      [true, false],
      () => AppBusiness.auth('unknown' as AccountStoreType),
    ],
    [
      'revoke',
      () => AppBusiness.revoke('twitch', 'token'),
      'revoke',
      ['token'],
      () => AppBusiness.revoke('unknown' as AccountStoreType, 'token'),
    ],
    [
      'getSelfUser',
      () => AppBusiness.getSelfUser('token', 'twitch'),
      'getSelfUser',
      ['token'],
      () => AppBusiness.getSelfUser('token', 'unknown' as AccountStoreType),
    ],
    [
      'getStreamersFollowed',
      () => AppBusiness.getStreamersFollowed(twitchAccount),
      'getStreamersFollowed',
      ['token', 'me-id'],
      () => AppBusiness.getStreamersFollowed(unknownAccount),
    ],
    [
      'getUserVideosArchive',
      () => AppBusiness.getUserVideosArchive(twitchAccount, '1', 'time', 'c', 20),
      'getUserVideosArchive',
      ['token', '1', 'time', 'c', 20],
      () => AppBusiness.getUserVideosArchive(unknownAccount, '1'),
    ],
    [
      'getUserClips',
      () => AppBusiness.getUserClips(twitchAccount, '1', '7d', 'c', 20),
      'getUserClips',
      ['token', '1', '7d', 'c', 20],
      () => AppBusiness.getUserClips(unknownAccount, '1'),
    ],
    [
      'getTopGamesCategory',
      () => AppBusiness.getTopGamesCategory(twitchAccount, 'c', 99),
      'getTopGamesCategory',
      ['token', 'c', 99],
      () => AppBusiness.getTopGamesCategory(unknownAccount),
    ],
    [
      'getStreamsByCategory',
      () => AppBusiness.getStreamsByCategory(twitchAccount, 'g', ['pt'], 'c', 20),
      'getStreamsByCategory',
      ['token', 'g', ['pt'], 'c', 20],
      () => AppBusiness.getStreamsByCategory(unknownAccount, 'g'),
    ],
    [
      'getCategoryById',
      () => AppBusiness.getCategoryById(twitchAccount, 'g'),
      'getCategoryById',
      ['token', 'g'],
      () => AppBusiness.getCategoryById(unknownAccount, 'g'),
    ],
    [
      'searchChannels',
      () => AppBusiness.searchChannels(twitchAccount, 'q', 'c', 100),
      'searchChannels',
      ['token', 'q', 'c', 100],
      () => AppBusiness.searchChannels(unknownAccount, 'q'),
    ],
    [
      'searchCategories',
      () => AppBusiness.searchCategories(twitchAccount, 'q', 'c', 100),
      'searchCategories',
      ['token', 'q', 'c', 100],
      () => AppBusiness.searchCategories(unknownAccount, 'q'),
    ],
    [
      'fetchCategoriesByIds',
      () => AppBusiness.fetchCategoriesByIds(twitchAccount, ['1']),
      'fetchCategoriesByIds',
      ['token', ['1']],
      () => AppBusiness.fetchCategoriesByIds(unknownAccount, ['1']),
    ],
    [
      'fetchCategoriesByNames',
      () => AppBusiness.fetchCategoriesByNames(twitchAccount, ['a']),
      'fetchCategoriesByNames',
      ['token', ['a']],
      () => AppBusiness.fetchCategoriesByNames(unknownAccount, ['a']),
    ],
  ]

  it.each(cases)('Delegate %s to the account business', async (_, call, method, args, unknownCall) => {
    const twitchMethod = TwitchBusiness[method as keyof typeof TwitchBusiness] as unknown as ReturnType<typeof vi.fn>
    twitchMethod.mockClear()

    await call()

    expect(twitchMethod).toHaveBeenCalledWith(...args)
    await expect(unknownCall()).rejects.toThrow('Type is undefined')
  })
})
