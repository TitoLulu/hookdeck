# Webhook Testing Plan: Hookdeck + Postman

## Tool Responsibilities

| Responsibility | Tool |
|---|---|
| Public ingestion URL (the URL you give senders) | **Hookdeck** source |
| Routing, retry logic, rate limiting, filtering | **Hookdeck** connection rules |
| Local forwarding during development | **Hookdeck** `listen` |
| Sending test payloads with controlled data | **Postman** collection |
| Asserting on responses and event structure | **Postman** `pm.test` scripts |
| Replay of captured events after a fix | **Hookdeck** event replay |
| Regression suite in CI | **Postman** CLI (`postman collection run`) |

---

## Phase 1 — Initialize the project

```bash
# In /repositories/hookdeck
postman init
```

Scaffolds `postman/` with collection, environment, and skill files. Creates an agent-scoped session so work is preserved before sign-in.

---

## Phase 2 — Create the Hookdeck connection

```bash
hookdeck gateway connection create \
  --name "webhook-test-connection" \
  --source-type WEBHOOK --source-name "test-source" \
  --destination-type MOCK_API --destination-name "mock-dest"
```

Produces a source URL (`https://hkdk.events/{SOURCE_ID}`) and routes to Mock API for safe early testing without a live server.

---

## Phase 3 — Build the Postman sender collection

Create a Postman collection with one request per webhook event type (e.g. `order.created`, `payment.succeeded`). Each request:
- POSTs to the Hookdeck source URL
- Sends the **sender's documented schema** (not a handler-matched payload)
- Carries a `pm.test` pre-request script that generates a stable idempotency key for deduplication
- Asserts on the Hookdeck acknowledgement response (HTTP 200, `request_id` present)

---

## Phase 4 — Local development loop

```bash
# Terminal 1: start your local handler
node server.js  # or whatever runs on port 3030

# Terminal 2: forward Hookdeck events to localhost
hookdeck listen 3030 test-source --path /webhook
```

Run the Postman collection against the source URL. For each event:
1. Hookdeck receives and logs it
2. Forwards to `localhost:3030/webhook`
3. Handler processes it
4. Use `hookdeck events list` to confirm delivery status

---

## Phase 5 — Validate event routing and rules

Add Postman tests for Hookdeck-specific behaviors:
- **Filtering**: send an event that should be filtered out; assert no delivery to destination
- **Retry**: simulate a 500 from the destination (use Postman mock); assert Hookdeck retries
- **Signature verification**: send a request with a bad signature; assert rejection

Use Hookdeck's Mock API destination (`https://mock.hookdeck.com`) as a controlled target that always returns 200, then swap in a Postman mock server that returns 500 for retry testing.

---

## Phase 6 — Promote to production

```bash
hookdeck gateway connection upsert webhook-test-connection \
  --destination-url https://your-production-endpoint.com/webhook
```

Re-run the Postman collection against the same source URL. The same assertions now prove live delivery.

---

## Phase 7 — CI integration

```bash
postman collection run postman/collections/webhook-tests.json \
  --environment postman/environments/hookdeck.json
```

Gate merges on this run. Use Hookdeck's event replay to re-test a handler fix without needing the sender to re-fire.

---

## Key gotcha

Build test payloads from the **sender's documented event schema** (Stripe docs, Shopify webhooks reference, etc.) — not from your handler's expected input. A payload shaped to match your handler only proves the two agree with each other, not that the real sender's events will work.

---

## Status

- [x] Phase 1: `postman init`
- [x] Phase 2: Create Hookdeck connection
- [x] Phase 3: Build Postman sender collection
- [x] Phase 4: Local development loop working
- [x] Phase 5: Routing and rules validated
- [x] Phase 6: Promoted to production
- [x] Phase 7: CI integration wired up
