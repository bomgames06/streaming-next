import { describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'
import { browser } from 'wxt/browser'
import countHandler, { registerCountHandler } from '@/background/handlers/countHandler'
import { account } from '@tests/__utils__/fixtures'

async function badge() {
  return {
    text: await browser.action.getBadgeText({}),
    color: await browser.action.getBadgeBackgroundColor({}),
  }
}
const PURPLE = [102, 0, 153, 255]

describe('countHandler', () => {
  it('Show the online count', async () => {
    await countHandler({ twitch: account() }, 5)
    expect(await badge()).toStrictEqual({ text: '5', color: PURPLE })

    await countHandler({}, 100)
    expect((await badge()).text).toBe('99+')

    await countHandler({}, 0)
    expect((await badge()).text).toBe('')
  })
  it('Show a warning when an account is invalid', async () => {
    await countHandler({ twitch: account({ invalid: true }) }, 5)

    expect((await badge()).text).toBe('!')
  })
  it('Reset the badge and answer badge messages', async () => {
    await browser.action.setBadgeText({ text: 'old' })
    registerCountHandler()
    await new Promise((resolve) => setTimeout(resolve))
    expect(await browser.action.getBadgeText({})).toBe('')
    expect(await browser.action.getBadgeTextColor({})).toBe('#FFFFFF')

    await fakeBrowser.runtime.onMessage.trigger({ type: 'setCountBadge', count: 3 }, {}, () => undefined)
    expect((await badge()).text).toBe('3')

    const colorSpy = vi.spyOn(browser.action, 'setBadgeBackgroundColor')
    await fakeBrowser.runtime.onMessage.trigger({ type: 'invalidateBadge' }, {}, () => undefined)
    expect((await badge()).text).toBe('!')
    expect(colorSpy).toHaveBeenCalledWith({ color: 'red' })

    expect(await fakeBrowser.runtime.onMessage.trigger({ type: 'other' }, {}, () => undefined)).toStrictEqual([
      undefined,
    ])
  })
})
