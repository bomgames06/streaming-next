import { describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import Option from '@/pages/Option.vue'
import QuickDialog from '@/pages/QuickDialog.vue'
import { STORAGE_KEY_ACCOUNTS } from '@/types/syncStorageKeysTypes'
import { bodyFind, bodyFindAll, mountWithStore, settle } from '@tests/__utils__/util'
import { twitchServer } from '@tests/__utils__/twitchServer'
import { account, apiFollowed, apiStream, apiUser } from '@tests/__utils__/fixtures'

function server() {
  return twitchServer({
    followedStreams: [apiStream({ user_id: '1', user_name: 'Alpha', user_login: 'alpha', game_name: 'Minecraft' })],
    followedChannels: [apiFollowed({ broadcaster_id: '1' }), apiFollowed({ broadcaster_id: '2' })],
    users: [
      apiUser({ id: '1', login: 'alpha', display_name: 'Alpha' }),
      apiUser({ id: '2', login: 'bravo', display_name: 'Bravo' }),
    ],
  })
}
function text() {
  return document.body.textContent || ''
}

describe('Option page', () => {
  it('Render the settings even without account', async () => {
    vi.spyOn(browser.commands, 'getAll').mockResolvedValue([] as never)

    const { system } = mountWithStore(Option)
    await settle()

    expect(system.screen).toBe('home')
    expect(bodyFind('h2')!.textContent).toBe('Settings')
    expect(text()).toContain('Quick list shortcut not set')
    expect(bodyFind('#toastr-content')).toBeTruthy()
  })
  it('Show the loading screen until the storage loads', async () => {
    vi.spyOn(browser.commands, 'getAll').mockResolvedValue([] as never)
    let release: () => void = () => undefined
    const get = browser.storage.sync.get.bind(browser.storage.sync)
    vi.spyOn(browser.storage.sync, 'get').mockImplementation(
      (keys) => new Promise((resolve) => (release = () => resolve(get(keys as never))))
    )

    const { system } = mountWithStore(Option)
    await settle()
    expect(text()).toContain('Loading')
    expect(system.screen).toBe('loading')

    release()
    await settle()
    expect(system.screen).toBe('home')
  })
})

describe('QuickDialog page', () => {
  async function mountPage() {
    fakeBrowser.runtime.onMessage.addListener(() => undefined)
    const result = mountWithStore(QuickDialog)
    await settle()
    return result
  }

  it('Ask for authentication without account', async () => {
    const { system } = await mountPage()

    expect(system.screen).toBe('auth')
    expect(text()).toContain('We need to authenticate to proceed')
  })
  it('List the followed streams and open one', async () => {
    server()
    await browser.storage.sync.set({ [STORAGE_KEY_ACCOUNTS]: { twitch: account() } })
    const createSpy = vi.spyOn(browser.tabs, 'create')
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)
    await mountPage()

    expect(bodyFindAll('.v-list-item-title').map((title) => title.getAttribute('title'))).toStrictEqual(['Alpha'])
    expect(text()).toContain('Minecraft')

    const filter = bodyFind<HTMLInputElement>('#quick-dialog-filter')!
    filter.value = 'bra'
    filter.dispatchEvent(new Event('input'))
    await settle()
    // Offlines show up while searching
    expect(bodyFindAll('.v-list-item-title').map((title) => title.getAttribute('title'))).toStrictEqual(['Bravo'])

    filter.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await settle()
    expect(createSpy).toHaveBeenCalledWith({ url: 'https://twitch.tv/bravo', active: true })
    expect(closeSpy).toHaveBeenCalledOnce()
  })
  it('Close with a free escape only', async () => {
    const { wrapper } = await mountPage()
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)

    const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
    handled.preventDefault()
    window.dispatchEvent(handled)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(closeSpy).not.toHaveBeenCalled()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closeSpy).toHaveBeenCalledOnce()

    wrapper.unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closeSpy).toHaveBeenCalledOnce()
  })
})
