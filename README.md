# Streaming Next

<img src="./public/icons/128.png" align="right" alt="Project Logo" />

Streaming Next is an extension to view, track and notify about streamers and category on the Twitch platform.

The application allows:
- List online and offline followers.
- View streamer videos and clips.
- List categories and referring streamers.
- Search streamers.
- Notify all, partial or none when going online.
- And others.

## Stores

- [Chrome Web Store](https://chrome.google.com/webstore/detail/streaming-next/kjhokibigaobhcmjabhjbhncapklgjkb)

## Project requirements

- Node: ^22.0.0
- Bun: >=1.1.0

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

### Lints and fixes files
```
bun run lint
```

