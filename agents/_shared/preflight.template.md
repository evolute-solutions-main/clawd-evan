# Preflight Template (include or reference from prompts)

Required inputs (example):
- Channels: ["discord:channel:1475336170916544524"]
- APIs: ["asana:1213220062504456", "notion:0dc56df6-24ea-4cc1-b4ea-a7b88f874da8"]
- Providers: ["openai", "anthropic"]

Checks:
- Channels: confirm allowed and can post (or dry-run)
- APIs: perform a minimal read to prove auth
- Providers: ensure recent runs didn’t hit quota
- Filesystem: ensure output path exists or can be created

On failure → Post: "Blocker: <system> <reason>" and exit.
