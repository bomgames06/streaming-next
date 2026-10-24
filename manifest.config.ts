import type { UserManifest } from 'wxt'
import { loadEnv } from 'vite'

function manifestConfig(command: 'build' | 'serve', mode: string): UserManifest {
  const backOrigin = new URL(loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_API_BACK_URL).origin

  let extensionPages = ''
  extensionPages += "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  extensionPages += `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net${command === 'serve' ? ' http://localhost:*' : ''};`
  extensionPages += `connect-src 'self' https://api.twitch.tv https://id.twitch.tv https://static-cdn.jtvnw.net https://www.googleapis.com https://oauth2.googleapis.com https://www.youtube.com https://yt3.ggpht.com https://yt3.googleusercontent.com ${backOrigin}${command === 'serve' ? ' ws://localhost:*' : ''};`
  extensionPages += `img-src 'self' https://vod-secure.twitch.tv https://static-cdn.jtvnw.net https://clips-media-assets2.twitch.tv https://i.ytimg.com https://yt3.ggpht.com https://yt3.googleusercontent.com data:${command === 'serve' ? ' http://localhost:*' : ''};`
  extensionPages += `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net${command === 'serve' ? ' http://localhost:*' : ''};`
  extensionPages += "frame-src 'self' https://player.twitch.tv;"

  return {
    name: '__MSG_appName__',
    description: '__MSG_appDesc__',
    default_locale: 'en',
    icons: {
      '16': 'icons/16.png',
      '48': 'icons/48.png',
      '128': 'icons/128.png',
    },
    action: {
      default_title: 'Streaming Next',
      default_icon: {
        '16': 'icons/16.png',
        '48': 'icons/48.png',
        '128': 'icons/128.png',
      },
    },
    // activeTab + scripting inject the quick dialog only in the tab where the command was used
    permissions: ['identity', 'storage', 'notifications', 'alarms', 'activeTab', 'scripting'],
    // The YouTube RSS feeds have no CORS, optional so a new permission does not disable existing installs
    optional_host_permissions: ['https://www.youtube.com/*'],
    commands: {
      'open-quick-dialog': {
        suggested_key: {
          default: 'Alt+Shift+S',
        },
        description: '__MSG_quickDialogCommand__',
      },
    },
    web_accessible_resources: [
      {
        resources: ['quick-dialog.html'],
        matches: ['<all_urls>'],
      },
    ],
    content_security_policy: {
      extension_pages: extensionPages,
    },
  }
}

export default manifestConfig
