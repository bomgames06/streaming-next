import { describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders, HttpStatusCode } from 'axios'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import type { Mock } from '@vitest/spy'
import registerFetchStreamBackground from '@/background/fetchStreamBackground'
import TwitchBusiness from '@/services/business/twitchBusiness'
import countHandler from '@/background/handlers/countHandler'
import notificationHandler from '@/background/handlers/notificationHandler'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import { account, onlineItem } from '@tests/__utils__/fixtures'

vi.mock('@/services/business/twitchBusiness', () => ({
  default: { getStreamersOnlineFollowed: vi.fn() },
}))
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
})
