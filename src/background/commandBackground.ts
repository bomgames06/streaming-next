import { browser } from 'wxt/browser'
import { QUICK_DIALOG_COMMAND } from '@/types/quickDialogTypes'

async function openQuickDialog(tabId?: number) {
  try {
    if (tabId === undefined) throw new Error('Command without tab')
    await browser.scripting.executeScript({
      target: { tabId },
      files: ['/quick-dialog-inject.js'],
    })
  } catch {
    // Pages like the browser settings or the extension stores can't be scripted, fall back to the popup
    await browser.action.openPopup().catch(() => undefined)
  }
}

export default function registerCommandBackground() {
  browser.commands.onCommand.addListener((command, tab) => {
    if (command === QUICK_DIALOG_COMMAND) void openQuickDialog(tab?.id)
  })
}
