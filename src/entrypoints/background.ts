import { defineBackground } from 'wxt/utils/define-background'
import registerUpdateBackground from '@/background/updateBackground'
import registerAuthBackground from '@/background/authBackground'
import registerFetchStreamBackground from '@/background/fetchStreamBackground'
import registerCommandBackground from '@/background/commandBackground'

export default defineBackground(() => {
  registerUpdateBackground()
  registerAuthBackground()
  registerFetchStreamBackground()
  registerCommandBackground()
})
