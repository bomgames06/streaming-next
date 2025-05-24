import browser from 'webextension-polyfill'

browser.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'open-quick-popup') {
    if (!tab?.id) return
    try {
      await browser.scripting.removeCSS({
        target: {
          tabId: tab.id,
        },
        files: ['quick-popup.css'],
      })
      await browser.scripting.insertCSS({
        target: {
          tabId: tab.id,
        },
        files: ['quick-popup.css'],
      })
      await browser.scripting.executeScript({
        target: {
          tabId: tab.id,
        },
        files: ['modulepreload-polyfill.js'],
      })
      await browser.scripting.executeScript({
        target: {
          tabId: tab.id,
        },
        files: ['src/quick-popup.js'],
      })
    } catch {
      await browser.action.openPopup()
    }
  }
})
