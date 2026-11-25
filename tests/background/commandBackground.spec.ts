import { describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import type { Browser } from 'wxt/browser'
import registerCommandBackground from '@/background/commandBackground'
import { QUICK_DIALOG_COMMAND } from '@/types/quickDialogTypes'

type CommandListener = (command: string, tab?: Browser.tabs.Tab) => void

function register() {
  let listener: CommandListener | undefined
  vi.spyOn(browser.commands.onCommand, 'addListener').mockImplementation((callback) => {
    listener = callback as CommandListener
  })
  registerCommandBackground()
  return listener!
}

describe('commandBackground', () => {
  it('Inject the quick dialog on the active tab', async () => {
    const executeScript = vi.spyOn(browser.scripting, 'executeScript').mockResolvedValue([] as never)
    const openPopup = vi.spyOn(browser.action, 'openPopup').mockResolvedValue(undefined)

    register()(QUICK_DIALOG_COMMAND, { id: 7 } as Browser.tabs.Tab)

    await vi.waitFor(() =>
      expect(executeScript).toHaveBeenCalledWith({ target: { tabId: 7 }, files: ['/quick-dialog-inject.js'] })
    )
    expect(openPopup).not.toHaveBeenCalled()
  })
  it('Fall back to the popup when the page cannot be scripted', async () => {
    vi.spyOn(browser.scripting, 'executeScript').mockRejectedValue(new Error('Cannot access chrome:// URL'))
    const openPopup = vi.spyOn(browser.action, 'openPopup').mockRejectedValue(new Error('no window'))
    const listener = register()

    listener(QUICK_DIALOG_COMMAND, { id: 7 } as Browser.tabs.Tab)
    await vi.waitFor(() => expect(openPopup).toHaveBeenCalledOnce())

    // Commands without a tab also open the popup
    listener(QUICK_DIALOG_COMMAND)
    await vi.waitFor(() => expect(openPopup).toHaveBeenCalledTimes(2))
  })
  it('Ignore other commands', () => {
    const executeScript = vi.spyOn(browser.scripting, 'executeScript').mockResolvedValue([] as never)

    register()('other-command', { id: 1 } as Browser.tabs.Tab)

    expect(executeScript).not.toHaveBeenCalled()
  })
})
