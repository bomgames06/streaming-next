import type { Manifest } from 'webextension-polyfill'

type Primitive = boolean | number | string | symbol | null | undefined | Primitive[]

type ManifestBrowserPrefixBase<K> = {
  [P in keyof K]?: K[P] extends Primitive ? K[P] : ManifestBrowserPrefix<K[P]>
}
type ManifestBrowserPrefixChrome<K> = {
  [P in keyof K as `{{chrome}}.${string & P}`]?: K[P]
}
type ManifestBrowserPrefixFirefox<K> = {
  [P in keyof K as `{{firefox}}.${string & P}`]?: K[P]
}

type ManifestBrowserPrefix<K> = ManifestBrowserPrefixBase<K> &
  ManifestBrowserPrefixChrome<K> &
  ManifestBrowserPrefixFirefox<K>

type ManifestBrowser = ManifestBrowserPrefix<Manifest.WebExtensionManifest>

function manifestConfig(command: 'build' | 'serve'): ManifestBrowser {
  let extensionPages = ''
  extensionPages += "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  extensionPages += `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net${command === 'serve' ? ' http://localhost:*' : ''};`
  extensionPages += `connect-src 'self' https://api.twitch.tv https://id.twitch.tv https://static-cdn.jtvnw.net${command === 'serve' ? ' ws://localhost:*' : ''};`
  extensionPages += `img-src 'self' https://vod-secure.twitch.tv https://static-cdn.jtvnw.net https://clips-media-assets2.twitch.tv data:${command === 'serve' ? ' http://localhost:*' : ''};`
  extensionPages += `font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net${command === 'serve' ? ' http://localhost:*' : ''};`
  extensionPages += "frame-src 'self' https://player.twitch.tv;"

  return {
    name: '__MSG_appName__',
    description: '__MSG_appDesc__',
    manifest_version: 3,
    default_locale: 'en',
    icons: {
      '16': 'icons/16.png',
      '48': 'icons/48.png',
      '128': 'icons/128.png',
    },
    action: {
      default_popup: 'src/popup.html',
      default_title: 'Streaming Next',
      default_icon: {
        '16': 'icons/16.png',
        '48': 'icons/48.png',
        '128': 'icons/128.png',
      },
    },
    options_ui: {
      page: 'src/option.html',
    },
    background: {
      service_worker: 'src/background.ts',
    },
    commands: {
      'open-quick-popup': {
        suggested_key: {
          default: 'Ctrl+Shift+Q',
        },
        description: 'Open Quick Popup',
      },
    },
    permissions: ['identity', 'storage', 'notifications', 'alarms', 'activeTab', 'scripting'],
    content_security_policy: {
      extension_pages: extensionPages,
    },
  }
}

export default manifestConfig
