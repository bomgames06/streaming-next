import { describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import Popup from '@/pages/Popup.vue'
import registerAuthBackground from '@/background/authBackground'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import { bodyFind, bodyFindAll, mountWithStore, settle } from '@tests/__utils__/util'
import { twitchServer } from '@tests/__utils__/twitchServer'
import { account, apiFollowed, apiGame, apiSearchChannel, apiStream, apiUser } from '@tests/__utils__/fixtures'

function server() {
  return twitchServer({
    me: apiUser({ id: 'me-id', display_name: 'Streamer Fan', login: 'fan' }),
    followedStreams: [
      apiStream({
        user_id: '1',
        user_name: 'Alpha',
        user_login: 'alpha',
        title: 'Building a castle',
        viewer_count: 42,
      }),
    ],
    followedChannels: [apiFollowed({ broadcaster_id: '1' }), apiFollowed({ broadcaster_id: '2' })],
    users: [
      apiUser({ id: '1', login: 'alpha', display_name: 'Alpha', broadcaster_type: 'partner' }),
      apiUser({ id: '2', login: 'bravo', display_name: 'Bravo' }),
    ],
    topGames: [apiGame({ id: 'g1', name: 'Minecraft' }), apiGame({ id: 'g2', name: 'Zelda' })],
    searchChannels: [apiSearchChannel({ id: '2', display_name: 'Bravo', broadcaster_login: 'bravo', is_live: false })],
  })
}
async function mountPopup() {
  // The background is always listening on the extension
  fakeBrowser.runtime.onMessage.addListener(() => undefined)
  const result = mountWithStore(Popup)
  await settle()
  return result
}
function text() {
  return document.body.textContent || ''
}
function streamTitles() {
  return bodyFindAll('.list-item .v-list-item-title').map((title) => title.getAttribute('title'))
}
async function openSidebarView(label: string) {
  bodyFind<HTMLElement>('.v-app-bar-nav-icon')!.click()
  await settle()
  bodyFind<HTMLElement>(`.v-navigation-drawer [aria-label="${label}"]`)!.click()
  await settle()
}

describe('Popup page', () => {
  it('Show the loading error when the storage fails', async () => {
    vi.spyOn(browser.storage.sync, 'get').mockRejectedValue(new Error('broken'))

    const { system } = await mountPopup()

    expect(system.screen).toBe('loading')
    expect(text()).toContain('Error loading application')
  })
  it('Authenticate on Twitch and land on the online streams', async () => {
    const { http } = server()
    registerAuthBackground()
    vi.spyOn(browser.identity, 'getRedirectURL').mockReturnValue('https://ext.chromiumapp.org/')
    const authFlow = vi.spyOn(browser.identity, 'launchWebAuthFlow').mockImplementation(async ({ url }) => {
      const state = new URL(url).searchParams.get('state')
      return `https://ext.chromiumapp.org/?code=the-code&state=${state}`
    })
    // fake-browser only resolves sendMessage for listeners answering `true`, so the auth reply is forwarded here
    const sendMessage = browser.runtime.sendMessage
    vi.spyOn(browser.runtime, 'sendMessage').mockImplementation(async (message: unknown) => {
      const results = await fakeBrowser.runtime.onMessage.trigger(message, {}, () => undefined)
      void sendMessage
      return results.find((value) => value !== undefined)
    })

    const { system } = await mountPopup()
    expect(system.screen).toBe('auth')
    expect(text()).toContain('We need to authenticate to proceed')

    bodyFind<HTMLElement>('button[data-testid="twitch-auth"]')!.click()
    await settle(60)

    expect(authFlow).toHaveBeenCalledOnce()
    expect(system.screen).toBe('home')
    expect(system.accounts.twitch).toMatchObject({
      token: 'fresh-token',
      refreshToken: 'twitch-refresh-token',
      name: 'Streamer Fan',
      invalid: false,
    })
    expect(http.requests.filter((request) => request.path === '/users')[0].headers.Authorization).toBe(
      'Bearer fresh-token'
    )
    const stored = await browser.storage.sync.get(STORAGE_KEY_ACCOUNTS)
    expect(stored[STORAGE_KEY_ACCOUNTS]).toMatchObject({ twitch: { token: 'fresh-token' } })

    // The home screen renders the app bar, the profile and the online streams
    expect(bodyFind('.profile-button')!.textContent).toContain('Streamer Fan')
    expect(streamTitles()).toStrictEqual(['Alpha'])
    expect(text()).toContain('Building a castle')
  })
  it('Open the home with a stored account and browse every view', async () => {
    const { http } = server()
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() } })

    const { system } = await mountPopup()

    expect(system.screen).toBe('home')
    // fetchAccounts refreshed the profile from the API
    expect(system.accounts.twitch!.name).toBe('Streamer Fan')
    expect(streamTitles()).toStrictEqual(['Alpha'])
    expect(bodyFind('.app-bar-view label')!.textContent).toBe('Filter')
    vi.spyOn(browser.commands, 'getAll').mockResolvedValue([] as never)

    await openSidebarView('Categories')
    expect(system.view).toBe('categories')
    expect(bodyFindAll('.category-item-title').map((title) => title.textContent?.trim())).toStrictEqual([
      'Minecraft',
      'Zelda',
    ])

    await openSidebarView('Search')
    expect(text()).toContain('Fill in the "Search" field to search for channels')
    const searchInput = bodyFind<HTMLInputElement>('.app-bar-view input')!
    searchInput.value = 'bravo'
    searchInput.dispatchEvent(new Event('input'))
    await settle(560)
    expect(http.find('/search/channels')[0].query.get('query')).toBe('bravo')
    expect(streamTitles()).toStrictEqual(['Bravo'])

    await openSidebarView('Settings')
    expect(bodyFind('.v-main h2')!.textContent).toBe('Settings')

    await openSidebarView('Streams')
    expect(streamTitles()).toStrictEqual(['Alpha'])
  })
  it('Filter the streams typed on the app bar', async () => {
    server()
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() }, showAlwaysOfflines: true })
    await mountPopup()
    expect(streamTitles()).toStrictEqual(['Alpha', 'Bravo'])

    const filter = bodyFind<HTMLInputElement>('.app-bar-view input')!
    filter.value = 'brav'
    filter.dispatchEvent(new Event('input'))
    await settle(300)

    expect(streamTitles()).toStrictEqual(['Bravo'])
  })
  it('Go to the auth screen when the stored account is rejected', async () => {
    const { http } = server()
    http.get('/users', { status: 401, data: { message: 'Invalid OAuth token' } })
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() } })

    const { system } = await mountPopup()

    expect(system.accounts.twitch!.invalid).toBe(true)
    expect(system.screen).toBe('auth')
    expect(text()).toContain('We need to authenticate to proceed')
    // The invalid account is shown to authenticate again or remove
    expect(bodyFind('button[data-testid="twitch-auth"]')!.textContent).toContain('Me')
    expect(bodyFind('button[data-testid="twitch-auth-delete"]')).toBeTruthy()
  })
  it('Apply the stored theme and language', async () => {
    server()
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() }, dark: true, language: 'pt-BR' })

    const { system } = await mountPopup()

    expect(bodyFind('.v-application')!.classList).toContain('v-theme--dark')
    expect(bodyFind('.app-bar-view button[aria-label="Atualizar"]')).toBeTruthy()
    expect(bodyFind('.app-bar-view label')!.textContent).toBe('Filtro')
    expect(document.documentElement.getAttribute('lang')).toBe('pt-BR')
    system.setLanguage('en', (await import('@/plugins/i18n')).default.global as never)
    system.setDark(false, (await import('@/plugins/vuetify')).default.theme as never)
  })
  it('Remove the account and go back to the auth screen', async () => {
    server()
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() } })
    const sendMessageSpy = vi.spyOn(browser.runtime, 'sendMessage')
    const { system } = await mountPopup()

    bodyFind<HTMLElement>('.profile-button')!.click()
    await settle()
    bodyFindAll<HTMLElement>('.v-overlay--active .v-list-item')
      .find((item) => item.textContent?.includes('Accounts'))!
      .click()
    await settle()
    bodyFind<HTMLElement>('button[data-testid="twitch-auth-delete"]')!.click()
    await settle()

    expect(system.accounts.twitch).toBeUndefined()
    expect(system.screen).toBe('auth')
    expect(sendMessageSpy).toHaveBeenCalledWith({ type: 'revoke', authType: 'twitch', token: 'token' })
    expect(text()).toContain('We need to authenticate to proceed')
  })
})
