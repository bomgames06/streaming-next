# Streaming Next

<img src="./public/icons/128.png" align="right" alt="Streaming Next logo" />

Streaming Next is a browser extension that puts the channels you follow on **Twitch**, **YouTube** and **Kick** in one
list. It shows who is live right now, notifies you when they go live, and opens the stream, video or clip in one click.

It runs on Chrome (and other Chromium browsers) and on Firefox, in English and Portuguese (Brazil).

## Stores

- [Chrome Web Store](https://chrome.google.com/webstore/detail/streaming-next/kjhokibigaobhcmjabhjbhncapklgjkb)

## Features

### One list for every platform

Log in to one, two or all three platforms; their channels appear together in the same list.

| Platform | What is listed                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------- |
| Twitch   | The followed channels, with the lives, viewers, game, uptime and a live preview                     |
| YouTube  | The subscriptions, with the lives and the scheduled lives (premieres and upcoming streams)          |
| Kick     | The channels you add by slug or URL (the Kick API has no list of the followed channels), with lives |

- Live channels come first, the offline ones show up on demand (or always, in the settings).
- Sort by name, viewers or game, ascending or descending, and filter by name or game while typing.
- Show or hide each platform and the YouTube scheduled lives with the filters at the top of the list.
- The extension icon shows how many channels are live, and a `!` when an account needs to log in again.

### Organize the channels

- **Favorites**: star channels (and Twitch categories) to see only them with one click.
- **Groups**: create named groups of channels, from any platform, and browse the list by group.

### Notifications

- Notify when **all**, **some** (the ones you choose) or **none** of the channels go live. Clicking a notification opens
  the live.
- **Game notifications**: get notified when someone starts streaming a game, from every channel or only the ones you
  pick. They match the category by name, so they work for Twitch and Kick lives.
- The lives are checked in the background every 30 seconds, also with the popup closed.

### Twitch content

- Recent videos of a channel (sorted by time, trending or views) and its clips (last 24 hours, 7 days, 30 days or all
  time).
- Top categories, with their lives filtered by language, and a search of categories.
- Search of any Twitch channel, followed or not.

### Quick list

Press **Alt+Shift+S** on any page to open a floating list of the live channels over it. Type to filter and press Enter to
open the first one, or use the arrows. A middle click opens the stream in the background and keeps the list open. The
shortcut can be changed in the browser shortcuts page.

### Settings

Dark mode, language, notification type, always showing the offline channels, and clearing the favorites and the
notifications.

## Accounts and privacy

The logins use the OAuth authorization code flow. The extension only asks for read access: the followed channels and the
profile on Twitch, the subscriptions on YouTube (`youtube.readonly`), and the profile and channels on Kick.

The access tokens expire in hours, so the extension renews them with a refresh token, without asking you to log in
again. Exchanging the code and renewing the token need the client secret of each platform, which can't be inside the
extension, so these two requests go through [streaming-next-back](../streaming-next-back). It stores nothing.

Everything else (accounts, favorites, groups, notifications and settings) stays on the browser storage, synced by the
browser between your devices.

YouTube lives are found from the channel feeds on `youtube.com`, so the extension asks for that permission when you log
in to YouTube. It keeps the YouTube API quota low, the lives are checked without the search endpoint.

## Project requirements

- Node: ^22.0.0
- Bun: >=1.1.0

Built with [WXT](https://wxt.dev), [Vue 3](https://vuejs.org), [Vuetify](https://vuetifyjs.com) and
[Pinia](https://pinia.vuejs.org).

## Configuration

The `.env` holds the API urls and the OAuth client ids. A platform whose client id is empty has its login hidden.

| Variable                           | Use                                                              |
| ---------------------------------- | ---------------------------------------------------------------- |
| `VITE_APP_OAUTH2_TWITCH_CLIENTID`  | Twitch application (client type "Confidential")                  |
| `VITE_APP_OAUTH2_YOUTUBE_CLIENTID` | Google Cloud OAuth client of type "Web application"              |
| `VITE_APP_OAUTH2_KICK_CLIENTID`    | Kick application, with the `user:read` and `channel:read` scopes |
| `VITE_APP_API_BACK_URL`            | streaming-next-back, the extension CSP is built from it          |

The redirect URI of the three applications is the one the browser gives to the extension:
`https://<extension id>.chromiumapp.org/` on Chromium and `https://<id>.extensions.allizom.org/` on Firefox.

## Project setup

```
bun install
```

### Compiles for development

```
bun run dev
bun run dev:firefox
```

### Compiles and minifies for production

Output goes to `dist/chrome-mv3` and `dist/firefox-mv3`.

```
bun run build
bun run build:firefox
```

### Packages the extension as a zip for the stores

```
bun run zip
bun run zip:firefox
```

### Type checks, lints and tests

```
bun run check
bun run lint
bun run test:run
```

The pre-commit hook runs the three of them.
