# hookdeck

Webhook testing setup using [Hookdeck](https://hookdeck.com) for ingestion/routing and [Postman](https://postman.com) for assertions.

## Prerequisites

- [Hookdeck CLI](https://hookdeck.com/docs/cli) — `hookdeck login`
- [Postman CLI](https://learning.postman.com/docs/postman-cli/postman-cli-installation/) — `postman login`
- Node.js 18+

## Quick start

```bash
# Terminal 1 — local webhook handler
node server.js

# Terminal 2 — forward Hookdeck events to localhost
hookdeck listen 3030 test-source --path /webhook

# Terminal 3 — run the test suite
postman collection run "postman/collections/Hookdeck Webhook Tests" \
  --environment postman/environments/Hookdeck.environment.yaml \
  --env-var "webhook_secret=<your-secret>"
```

## What's tested

| Request | Verifies |
|---|---|
| `resource.created/updated/deleted` | Hookdeck ingests and acknowledges (200), HMAC signature accepted |
| `bad-signature` | Hookdeck rejects invalid signature (401) |
| `filter-miss` | Hookdeck ingests but filters before delivery (200, `ignored_count=1`) |
| `retry-trigger` | Hookdeck accepts event routed to a 500 destination and retries 3× |

## Hookdeck connections

| Connection | Source URL | Destination | Rules |
|---|---|---|---|
| `webhook-test-connection` | `hkdk.events/ou0fax6iy9p9sa` | Mock API | header filter + retry on 500–599 |
| `webhook-prod-connection` | same | prod mock (port 4500) | — |
| `cli-retry-test-source` | `hkdk.events/kb0qoo7ac90kt3` | port 3031 (always 500) | retry 3× |

Signature verification (HMAC SHA256, header `X-Webhook-Signature`) is enabled on `test-source`.

## CI

The GitHub Actions workflow (`.github/workflows/webhook-tests.yml`) runs on every PR:

1. Lint collection and environment
2. Run the full test suite against the live Hookdeck source

After merge to `main` it publishes the collection to the Postman workspace.

**Required secrets** (`Settings → Secrets → Actions`):

| Secret | Description |
|---|---|
| `POSTMAN_API_KEY` | Postman API key |
| `HOOKDECK_WEBHOOK_SECRET` | HMAC secret for `test-source` |

## Local servers

| File | Port | Purpose |
|---|---|---|
| `server.js` | 3030 | Dev webhook handler with idempotency deduplication |
| `server-500.js` | 3031 | Always returns 500 — used to trigger retry testing |
| `postman/mocks/webhook-production-handler/default.js` | 4500 | Production handler mock |
