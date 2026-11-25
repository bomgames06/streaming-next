import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders, HttpStatusCode } from 'axios'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import type { Mock } from '@vitest/spy'
import registerFetchStreamBackground from '@/background/fetchStreamBackground'
import TwitchBusiness from '@/services/business/twitchBusiness'
import AppBusiness from '@/services/business/appBusiness'
import countHandler from '@/background/handlers/countHandler'
import notificationHandler from '@/background/handlers/notificationHandler'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import type { AccountDataStore, AccountStore } from '@/store/system/types/systemStoreType'
import { account, onlineItem } from '@tests/__utils__/fixtures'

vi.mock('@/services/business/twitchBusiness', () => ({
  default: { getStreamersOnlineFollowed: vi.fn(), validateToken: vi.fn(async () => true) },
}))
vi.mock('@/services/business/appBusiness', () => ({ default: { renewToken: vi.fn() } }))
vi.mock('@/background/handlers/countHandler', () => ({
  default: vi.fn(),
  registerCountHandler: vi.fn(),
}))
vi.mock('@/background/handlers/notificationHandler', () => ({
  default: vi.fn(),
  registerNotificationHandler: vi.fn(),
}))

const getOnlinesMock = TwitchBusiness.getStreamersOnlineFollowed as Mock<
  typeof TwitchBusiness.getStreamersOnlineFollowed
>
const validateMock = TwitchBusiness.validateToken as Mock<typeof TwitchBusiness.validateToken>
const renewMock = AppBusiness.renewToken as Mock<typeof AppBusiness.renewToken>
const countHandlerMock = countHandler as Mock<typeof countHandler>
const notificationHandlerMock = notificationHandler as Mock<typeof notificationHandler>

function unauthorized() {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
    status: HttpStatusCode.Unauthorized,
    statusText: '',
    data: {},
    headers: {},
    config,
  })
}
const onlines = [onlineItem(), onlineItem({ id: '2' })]
async function register() {
  countHandlerMock.mockClear()
  notificationHandlerMock.mockClear()
  getOnlinesMock.mockReset()
  getOnlinesMock.mockResolvedValue(onlines)
  registerFetchStreamBackground()
  // The first fetch runs right away
  await vi.waitFor(() => expect(countHandlerMock).toHaveBeenCalled())
}
function alarm(name: string) {
  return { name, scheduledTime: Date.now() } as Browser.alarms.Alarm
}

describe('fetchStreamBackground', () => {
  it('Create the alarm only once and fetch on start', async () => {
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() } })
    await register()

    expect(await browser.alarms.get('fetchStream')).toMatchObject({ name: 'fetchStream', periodInMinutes: 0.5 })
    expect(getOnlinesMock).toHaveBeenCalledWith('token', 'me-id', true)
    expect(countHandlerMock).toHaveBeenCalledWith({ twitch: account() }, 2)
    expect(notificationHandlerMock).toHaveBeenCalledWith(onlines)

    const createSpy = vi.spyOn(browser.alarms, 'create')
    await register()
    expect(createSpy).not.toHaveBeenCalled()
  })
  it('Fetch on its alarm and on the fetch message only', async () => {
    await register()

    await fakeBrowser.alarms.onAlarm.trigger(alarm('other'))
    expect(countHandlerMock).toHaveBeenCalledTimes(1)

    await fakeBrowser.alarms.onAlarm.trigger(alarm('fetchStream'))
    expect(countHandlerMock).toHaveBeenCalledTimes(2)

    await fakeBrowser.runtime.onMessage.trigger({ type: 'fetchStream' }, {}, () => undefined)
    expect(countHandlerMock).toHaveBeenCalledTimes(3)

    await fakeBrowser.runtime.onMessage.trigger({ type: 'other' }, {}, () => undefined)
    expect(countHandlerMock).toHaveBeenCalledTimes(3)
  })
  it('Skip the API without a valid account', async () => {
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account({ invalid: true }) } })
    await register()

    expect(getOnlinesMock).not.toHaveBeenCalled()
    expect(countHandlerMock).toHaveBeenCalledWith({ twitch: account({ invalid: true }) }, 0)
  })
  it('Ignore fetches while one is running', async () => {
    await register()
    let resolve: (value: ReturnType<typeof onlineItem>[]) => void = () => undefined
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() } })
    getOnlinesMock.mockImplementationOnce(() => new Promise((r) => (resolve = r)))

    const first = fakeBrowser.alarms.onAlarm.trigger(alarm('fetchStream'))
    await vi.waitFor(() => expect(getOnlinesMock).toHaveBeenCalledOnce())
    await fakeBrowser.alarms.onAlarm.trigger(alarm('fetchStream'))
    resolve([])
    await first

    expect(getOnlinesMock).toHaveBeenCalledOnce()
  })
  it('Invalidate the account when the token is rejected', async () => {
    await register()
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() } })
    getOnlinesMock.mockRejectedValueOnce(unauthorized())
    countHandlerMock.mockClear()

    await fakeBrowser.alarms.onAlarm.trigger(alarm('fetchStream'))

    const sync = await browser.storage.sync.get(STORAGE_KEY_ACCOUNTS)
    expect(sync[STORAGE_KEY_ACCOUNTS]).toStrictEqual({ twitch: account({ invalid: true }) })
    expect(countHandlerMock).toHaveBeenCalledWith({ twitch: account({ invalid: true }) }, 0)
  })
  it('Keep the account on other errors', async () => {
    await register()
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() } })
    getOnlinesMock.mockRejectedValueOnce(new Error('Network Error'))
    countHandlerMock.mockClear()

    await fakeBrowser.alarms.onAlarm.trigger(alarm('fetchStream'))

    const sync = await browser.storage.sync.get(STORAGE_KEY_ACCOUNTS)
    expect(sync[STORAGE_KEY_ACCOUNTS]).toStrictEqual({ twitch: account() })
    expect(countHandlerMock).not.toHaveBeenCalled()
  })
  describe('Twitch token', () => {
    const HOUR = 60 * 60 * 1000
    // The last validation is kept in memory, the time goes forward so each test starts without a recent one
    let now = Date.now() + 10 * HOUR
    function advance(time: number) {
      now += time
      vi.setSystemTime(now)
    }
    async function fetchWith(twitch: AccountStore) {
      await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch } })
      countHandlerMock.mockClear()
      notificationHandlerMock.mockClear()
      await fakeBrowser.alarms.onAlarm.trigger(alarm('fetchStream'))
    }
    async function storedTwitch() {
      return ((await browser.storage.sync.get(STORAGE_KEY_ACCOUNTS))[STORAGE_KEY_ACCOUNTS] as AccountDataStore).twitch!
    }
    beforeEach(async () => {
      await register()
      vi.useFakeTimers({ toFake: ['Date'] })
      advance(10 * HOUR)
      validateMock.mockReset().mockResolvedValue(true)
      renewMock.mockReset()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('Validate the token on start and every hour', async () => {
      await fetchWith(account())
      expect(validateMock).toHaveBeenCalledExactlyOnceWith('token')

      advance(HOUR - 1000)
      await fetchWith(account())
      expect(validateMock).toHaveBeenCalledOnce()

      advance(1000)
      await fetchWith(account())
      expect(validateMock).toHaveBeenCalledTimes(2)
    })
    it('Invalidate the accounts logged before the code flow when the token is no longer valid', async () => {
      validateMock.mockResolvedValue(false)
      getOnlinesMock.mockClear()
      await fetchWith(account())

      expect(await storedTwitch()).toStrictEqual(account({ invalid: true }))
      expect(getOnlinesMock).not.toHaveBeenCalled()
    })
    it('Renew the expired token, saving the rotated refresh token', async () => {
      // The account is updated in place, so the sent refresh token is kept apart
      const sent: string[] = []
      renewMock.mockImplementation(async (value) => {
        sent.push(value.refreshToken!)
        return { token: 'renewed', expiresAt: now + 4 * HOUR, refreshToken: 'rotated' }
      })
      await fetchWith(account({ expiresAt: now - 1000, refreshToken: 'refresh' }))

      expect(sent).toStrictEqual(['refresh'])
      expect(getOnlinesMock).toHaveBeenLastCalledWith('renewed', 'me-id', true)
      expect(await storedTwitch()).toStrictEqual(
        account({ token: 'renewed', expiresAt: now + 4 * HOUR, refreshToken: 'rotated' })
      )
    })
    it('Renew on the next fetch a token rejected by Twitch', async () => {
      validateMock.mockResolvedValue(false)
      renewMock.mockResolvedValue({ token: 'renewed', expiresAt: now + 4 * HOUR })
      await fetchWith(account({ expiresAt: now + HOUR, refreshToken: 'refresh' }))
      expect(getOnlinesMock).toHaveBeenLastCalledWith('renewed', 'me-id', true)

      getOnlinesMock.mockRejectedValueOnce(unauthorized())
      await fetchWith(account({ expiresAt: now + HOUR, refreshToken: 'refresh' }))
      expect(await storedTwitch()).toMatchObject({ expiresAt: 0, invalid: false })
    })
    it('Wait the next fetch when the renew fails for other reasons', async () => {
      renewMock.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
      await fetchWith(account({ expiresAt: now - 1000, refreshToken: 'refresh' }))

      expect((await storedTwitch()).invalid).toBe(false)
      // Without the streams the notifications would take the lives as ended
      expect(countHandlerMock).not.toHaveBeenCalled()
      expect(notificationHandlerMock).not.toHaveBeenCalled()
    })
    it('Invalidate the account when the refresh token is rejected', async () => {
      renewMock.mockRejectedValue(unauthorized())
      await fetchWith(account({ expiresAt: now - 1000, refreshToken: 'refresh' }))

      expect((await storedTwitch()).invalid).toBe(true)
      expect(countHandlerMock).toHaveBeenCalledWith({ twitch: expect.objectContaining({ invalid: true }) }, 0)
    })
  })
})
