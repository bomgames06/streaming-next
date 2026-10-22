import { QUICK_DIALOG_CLOSE_MESSAGE } from '@/types/quickDialogTypes'

export function closeQuickDialog() {
  // Inside the iframe the page that hosts it removes the dialog, opened directly it is a normal tab
  if (window.parent !== window) window.parent.postMessage({ type: QUICK_DIALOG_CLOSE_MESSAGE }, '*')
  else window.close()
}
