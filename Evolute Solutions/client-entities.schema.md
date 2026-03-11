# Client Entities — Schema (v1)

Canonical database file: `Evolute Solutions/client-entities.json`

## Goals
- One place to map a client across **Discord + Asana + (later) Meta/Notion/etc.**
- Stable IDs so automations can run forever.

## Entity (v1)
Each client entry should look like:

- `id` (string): stable slug, e.g. `american-designer-homes`
- `businessName` (string)
- `nickname` (string, optional)
- `owner` (object, optional)
  - `owner.name` (string, optional)
  - `owner.discordUsername` (string, optional)
- `status` (string): `initial_launch|making_updates|active|paused|at_risk` (start with `active`)

### Discord
- `discord.guildId` (string)
- `discord.channelId` (string)
- `discord.channelName` (string, optional)

### Asana
- `asana.clientHubTaskGid` (string, optional until we link)
- `asana.contractTaskGid` (string, optional)

### Client Hub fields (Asana mirror)
Store a mirrored snapshot of the Client Hub 3.0 fields so the entity is self-contained.

- `clientHub` (object)
  - `healthScore` (string) — e.g. `🟢 Stable|🟡 Attention|🔴 At Risk`
  - `accountPerformance` (string) — e.g. `📈 Performing|📉 Underperforming`
  - `videoPhotosStatus` (string)
  - `adStatus` (string)
  - `serviceBeingAdvertised` (string)
  - `asana` (object)
    - `fields` (object) — raw Asana custom field snapshot keyed by `customFieldGid`
    - `lastSyncedAt` (string ISO)

### Meta (future)
- `meta.businessId` / `meta.adAccountId` / `meta.pixelId` (optional)

### Activity log (syncs to Asana comments)
- `logs` (array, optional; append-only)
  - `id` (string): stable event id
  - `createdAt` (string ISO)
  - `type` (string): e.g. `status_change|client_request|blocker|performance_note|renewal_intent`
  - `summary` (string)
  - `details` (string, optional)
  - `evidence` (object, optional)
    - `discord` (array of `{channelId,messageId,author}`)
    - `asana` (array of `{taskGid,commentGid}`)
  - `appliedChanges` (object, optional)
  - `confidence` (string): `high|med|low`

### Notes
- `notes` (string, optional)

## Minimal viable now
For “forever updates” we can start with:
- `id`, `name`, `status`
- `discord.channelId`, `discord.guildId`
…and progressively fill Asana/Meta IDs as we connect them.
