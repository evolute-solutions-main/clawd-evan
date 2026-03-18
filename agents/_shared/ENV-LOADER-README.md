# Environment Loader — Single Source of Truth

## The Problem

Secrets were loaded from multiple places that could conflict:
- `.secrets.env` (intended source)
- `/root/.clawdbot/env` (sometimes had placeholders)
- Systemd Environment= lines (could be truncated/broken)
- Old scripts using `if (!process.env[key])` which didn't override existing broken values

This caused recurring "401 Unauthorized" errors when tokens were broken.

## The Solution

**`env-loader.mjs`** is now the single source of truth:

1. **Loads from `.secrets.env` only**
2. **ALWAYS overwrites existing env vars** (no more "if not exists" bugs)
3. **Validates critical tokens** before allowing scripts to proceed
4. **Auto-runs on import** — just `import './env-loader.mjs'` at the top of any script

## Usage

Every script that needs secrets should have this as its **FIRST import**:

```javascript
// MUST be first import - loads and validates all secrets
import '../../_shared/env-loader.mjs'

import { whatever } from './other-module.mjs'
// ... rest of script
```

## What It Validates

- `DISCORD_BOT_TOKEN` must exist and be at least 50 characters
- Rejects placeholders like "PASTE_NEW_TOKEN_HERE" or "YOUR_TOKEN_HERE"

## Shared Modules

Shared modules (`discord-fetcher`, `google-sheets`, `fathom`, `asana`) no longer load secrets themselves. They expect `process.env` to already be populated by the calling script importing `env-loader.mjs` first.

## If Things Break

1. Check `.secrets.env` exists and has correct values
2. Run: `node -e "import './agents/_shared/env-loader.mjs'"` to test
3. Ensure no other files are setting env vars (check for `/root/.clawdbot/env`, systemd Environment= lines)
