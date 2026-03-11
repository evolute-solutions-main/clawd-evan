# Discord Fetcher (Shared)

Purpose: single, reusable Discord history fetch utility for all agents.

Standard:
- Bot token source: .secrets.env → DISCORD_BOT_TOKEN (required)
- Timezone: read from SETTINGS.md (key: timezone)
- Inputs: channelIds [string...], window (YYYY-MM-DD, inclusive [00:00:00–23:59:59] in repo timezone)
- Filter helpers: by author name, substring match (case-insensitive)
- Output: iterator of { id, channelId, author, content, tsUtc, tsLocal }

Usage (example):
```js
import { fetchChannelWindow } from './index.mjs'
const rows = await fetchChannelWindow({
  channelIds: ['1387098677646196887','1332578941407334430'],
  date: '2026-03-10'
})
```

Preflight (agents should do before calling):
- Ensure DISCORD_BOT_TOKEN present
- Ensure channels exist
- Read timezone from SETTINGS.md
