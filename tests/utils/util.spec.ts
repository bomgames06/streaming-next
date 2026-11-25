import { afterEach, describe, expect, it, vi } from 'vitest'
import moment from 'moment'
import { browser } from 'wxt/browser'
import {
  accountProfileUrl,
  accountTypeColor,
  generateState,
  getTimeByClipPeriod,
  includeUtil,
  isSameCategoryName,
  partition,
  sleep,
  streamItemProfileUrl,
  twitchDurationToSeconds,
  twitchOAuthRevoke,
  twitchOAuthWebAuth,
  twitchUrl,
} from '@/utils/util'
import { resolveLocale } from '@/plugins/i18n'
import { closeQuickDialog } from '@/utils/quickDialog'
import { QUICK_DIALOG_CLOSE_MESSAGE } from '@/types/quickDialogTypes'
import type { AccountStore, AccountStoreType } from '@/store/system/types/systemStoreType'
import type { StreamItemType } from '@/components/listStream/types/streamItemType'
import {
  isContentStream,
  isOfflineStream,
  isOnlineStream,
  isStream,
} from '@/components/listStream/types/streamItemType'
import { account, clipItem, offlineItem, onlineItem, streamItem, videoItem } from '@tests/__utils__/fixtures'

describe('util.ts', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('partition', () => {
    it('Split collection in chunks', () => {
      expect(partition([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]])
    })
    it('Return no chunk for empty collection', () => {
      // An empty chunk would make the Twitch API return the authenticated user or a 400
      expect(partition([], 100)).toStrictEqual([])
    })
  })
  describe('generateState', () => {
    it('Generate alphanumeric value with the requested size', () => {
      expect(generateState()).toMatch(/^[a-zA-Z0-9]{50}$/)
      expect(generateState(10)).toMatch(/^[a-zA-Z0-9]{10}$/)
    })
  })
  describe('isSameCategoryName', () => {
    it('Compare ignoring case', () => {
      expect(isSameCategoryName('Just Chatting', 'just chatting')).toBe(true)
      expect(isSameCategoryName('Just Chatting', 'Minecraft')).toBe(false)
    })
    it('Never match empty names', () => {
      expect(isSameCategoryName('', '')).toBe(false)
      expect(isSameCategoryName(undefined, 'Minecraft')).toBe(false)
    })
  })
  describe('includeUtil', () => {
    it('Match ignoring case and accents', () => {
      expect(includeUtil('Pokémon Café', 'pokemon')).toBe(true)
      expect(includeUtil('Minecraft', 'CRAFT')).toBe(true)
      expect(includeUtil('Minecraft', 'zelda')).toBe(false)
      expect(includeUtil(undefined, '')).toBe(true)
    })
  })
  describe('twitchDurationToSeconds', () => {
    it('Convert Twitch duration', () => {
      expect(twitchDurationToSeconds('1h2m3s')).toBe(3723)
      expect(twitchDurationToSeconds('2m')).toBe(120)
      expect(twitchDurationToSeconds('45s')).toBe(45)
      expect(twitchDurationToSeconds('invalid')).toBe(0)
    })
  })
  describe('getTimeByClipPeriod', () => {
    it('Subtract the period from now', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-10-23T12:00:00Z'))

      expect(getTimeByClipPeriod('24h')!.toISOString()).toBe('2026-10-22T12:00:00.000Z')
      expect(getTimeByClipPeriod('7d')!.toISOString()).toBe('2026-10-16T12:00:00.000Z')
      expect(getTimeByClipPeriod('30d')!.toISOString()).toBe('2026-09-23T12:00:00.000Z')
      expect(getTimeByClipPeriod('all')).toBeUndefined()
      expect(getTimeByClipPeriod()).toBeUndefined()
      expect(moment.isMoment(getTimeByClipPeriod('7d'))).toBe(true)
    })
  })
  describe('sleep', () => {
    it('Resolve after the given time', async () => {
      vi.useFakeTimers()
      const resolved = vi.fn()
      void sleep(100).then(resolved)

      await vi.advanceTimersByTimeAsync(99)
      expect(resolved).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      expect(resolved).toHaveBeenCalledOnce()
    })
  })
  describe('Twitch OAuth', () => {
    it('Build the authorize url', () => {
      vi.spyOn(browser.identity, 'getRedirectURL').mockReturnValue('https://ext.chromiumapp.org/')

      const url = new URL(twitchOAuthWebAuth('state-value', true))

      expect(`${url.origin}${url.pathname}`).toBe(`${import.meta.env.VITE_APP_OAUTH2_TWITCH_URL}/authorize`)
      expect(Object.fromEntries(url.searchParams)).toStrictEqual({
        client_id: import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
        redirect_uri: 'https://ext.chromiumapp.org/',
        response_type: 'code',
        state: 'state-value',
        force_verify: 'true',
        scope: 'user:read:follows user:read:email',
      })
      expect(new URL(twitchOAuthWebAuth('s')).searchParams.get('force_verify')).toBe('false')
    })
    it('Build the revoke request', () => {
      const { url, body } = twitchOAuthRevoke('token')

      expect(url).toBe(`${import.meta.env.VITE_APP_OAUTH2_TWITCH_URL}/revoke`)
      expect(Object.fromEntries(body)).toStrictEqual({
        client_id: import.meta.env.VITE_APP_OAUTH2_TWITCH_CLIENTID,
        token: 'token',
      })
    })
  })
  describe('Account helpers', () => {
    const unknown = 'unknown' as AccountStoreType

    it('Resolve the account color class', () => {
      expect(accountTypeColor('twitch')).toBe('twitch')
      expect(accountTypeColor('twitch', true)).toBe('bg-twitch')
      expect(accountTypeColor('twitch', false, true)).toBe('text-twitch')
      expect(() => accountTypeColor(unknown)).toThrow('accountType is undefined')
    })
    it('Resolve profile urls', () => {
      expect(twitchUrl('alpha')).toBe('https://twitch.tv/alpha')
      expect(accountProfileUrl(account())).toBe('https://twitch.tv/me')
      expect(streamItemProfileUrl(streamItem())).toBe('https://twitch.tv/alpha')
      expect(() => accountProfileUrl({ ...account(), type: unknown } as AccountStore)).toThrow()
      expect(() => streamItemProfileUrl({ ...streamItem(), type: unknown } as StreamItemType)).toThrow()
    })
  })
  describe('Stream item guards', () => {
    it('Classify every status', () => {
      const items = [onlineItem(), offlineItem(), streamItem(), videoItem(), clipItem()]

      expect(items.map(isOnlineStream)).toStrictEqual([true, false, false, false, false])
      expect(items.map(isOfflineStream)).toStrictEqual([false, true, true, false, false])
      expect(items.map(isStream)).toStrictEqual([true, true, true, false, false])
      expect(items.map(isContentStream)).toStrictEqual([false, false, false, true, true])
    })
  })
  describe('closeQuickDialog', () => {
    it('Close the window when opened directly', () => {
      const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)

      closeQuickDialog()

      expect(closeSpy).toHaveBeenCalledOnce()
    })
    it('Ask the host page when inside an iframe', () => {
      const postMessage = vi.fn()
      vi.spyOn(window, 'parent', 'get').mockReturnValue({ postMessage } as unknown as Window)

      closeQuickDialog()

      expect(postMessage).toHaveBeenCalledWith({ type: QUICK_DIALOG_CLOSE_MESSAGE }, '*')
    })
  })
  describe('resolveLocale', () => {
    it('Resolve to a supported locale', () => {
      expect(resolveLocale('pt-BR')).toBe('pt-BR')
      expect(resolveLocale('pt')).toBe('pt-BR')
      expect(resolveLocale('pt-PT')).toBe('pt-BR')
      expect(resolveLocale('en-US')).toBe('en')
      expect(resolveLocale('es-ES')).toBeUndefined()
      expect(resolveLocale(undefined)).toBeUndefined()
    })
  })
})
