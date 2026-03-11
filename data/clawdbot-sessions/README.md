# Clawdbot sessions (isolated)

This folder contains a separate, searchable index of **Clawdbot session logs**.

It is intentionally **not merged** with the ChatGPT export index.

## Layout
- `derived/sessions.jsonl` — 1 line per session (metadata)
- `derived/messages.jsonl` — flat list of user/assistant/tool text messages (good for grep/search)
- `derived/text/<session_id>.md` — readable markdown per session

## Rebuild
From `/Users/max/clawd`:

```bash
node tools/clawdbot_sessions/index_sessions.js \
  --in /Users/max/.clawdbot/agents/main/sessions \
  --out data/clawdbot-sessions/derived
```

## Search
If you have `rg` installed:

```bash
rg -n "keyword" data/clawdbot-sessions/derived/messages.jsonl
```
