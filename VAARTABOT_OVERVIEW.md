# Vaartabot — Architecture Overview

Written 2026-06-23 after a code-read-only exploration (no production DB queries were run —
the live `whatsapp_bulk` database was deliberately not touched without explicit authorization).
Purpose of this doc: so a future session can understand this project without re-exploring from scratch.

## What this actually is

Despite the folder name `vaartabot` and the live domain `vaartabot.com`, the code identifies itself
differently in two places — this is a renamed/repurposed project, not a fresh build:
- `backend/package.json` → `"name": "venturebot-backend"`
- `backend/README.md` → "Realty Connect Panel — Multi-tenant Real Estate CRM"

In practice it is a **generic multi-tenant WhatsApp Business automation SaaS platform** — leads,
appointments, bulk campaigns, credit-based billing, dashboard analytics, all driven by a
per-tenant conversational flow engine. Real estate is documented as the first/pilot vertical, but
the architecture is vertical-agnostic (any tenant + any WhatsApp number + any flow).

**Status: a separate, currently-live system** (per Nachiketh, 2026-06-23) — not a test/throwaway
project. Treat its production database and deployed backend as live infrastructure; don't modify
or query without explicit instruction.

## Location & stack

- Path: `/Users/nachikethdesai/vaartabot/`
- `backend/` — Node.js + Express, ES modules (`"type": "module"`), MySQL via `mysql2`
- `frontend/` — React + Vite + TypeScript + Tailwind (shadcn-style `components.json`), uses `bun.lockb`
- `database/` — raw SQL dumps: `whatsapp_bulk.sql`, `whatsapp_bulk_new.sql`
- Local dev DB: MySQL running locally via Homebrew (`brew services`), database name `whatsapp_bulk`,
  confirmed running on this Mac as of 2026-06-23 (so local dev against a real schema is possible,
  but wasn't done here — see note above).
- Live domain: `vaartabot.com`

## The critical fact for milarch-agent

The Meta WhatsApp webhook Callback URL configured for **the same phone number / Meta App
("Milarch Tech", app_id `1596331437993038`) that milarch-agent's `.env` uses**
(`WHATSAPP_PHONE_NUMBER_ID=971897292671577`) is:

```
https://vaartabot.com/api/whatsapp/webhook
```

This is confirmed to map exactly onto this codebase: `backend/src/app.js` mounts
`app.use('/api/whatsapp', webhookRouter)`, and `backend/src/routes/webhook.js` defines the
`/webhook` GET (verify) and POST (message) handlers — giving the exact path above.

**Consequence:** a WhatsApp phone number can only have one Callback URL. As long as it points here,
any inbound WhatsApp message (replies from Rohan/Abhishek/Nachiketh to the milarch-agent check-in)
arrives at *this* backend, not at `milarch-agent`'s own `/webhook` endpoint. milarch-agent can send
messages out fine (proven working via the `milarch_daily_checkin` template), but can't receive
replies unless one of these is done:
1. Get a separate WhatsApp number + separate Meta App dedicated to milarch-agent, or
2. Build the MR check-in as a **flow** inside Vaartabot itself (see Architecture below — this is
   plausibly the more natural fit, since Vaartabot already has the multi-tenant + flow-engine
   machinery this would need), or
3. Modify Vaartabot to relay/forward messages from specific phone numbers to milarch-agent's webhook.

No decision had been made as of 2026-06-23 — this was left open pending further discussion.

## Architecture: multi-tenancy + flow engine

Incoming webhook flow (`backend/src/routes/webhook.js`):
1. `GET /api/whatsapp/webhook` — Meta's verify handshake. Checks the verify token against, in order:
   `whatsapp_config.verify_token` (DB) → `tenants.verify_token` (DB) → `process.env.WHATSAPP_VERIFY_TOKEN`
   (env fallback). So **each tenant can have its own verify token**, configured in the DB.
2. `POST /api/whatsapp/webhook` — acks `200` immediately, then processes async:
   - Extracts `phone_number_id` from the payload metadata
   - `resolveTenant(phoneNumberId)` → tries `whatsappConfigService.getTenantByPhoneNumberId()` first,
     falls back to a direct `tenants.whatsapp_phone_id` query
   - If no tenant resolves, the payload is dropped (logged, not processed)
   - Status updates (`sent`/`delivered`/`read`/`failed`) update `message_logs` by `message_id` + `tenant_id`
   - Actual messages: logs to `message_logs` (direction `inbound`), normalizes the input (text body,
     button payload, interactive reply, or placeholder tags like `__image__`/`__location__`), then
     calls `processFlow(tenantId, from, userInput, message)` from `services/flowEngine.js`

So **each WhatsApp number is mapped to exactly one tenant**, and each tenant's conversation logic
lives in a flow definition that `flowEngine.js` (~28KB, the largest service file) interprets.
Building a new conversational behavior (like a daily MR check-in) most likely means defining a new
flow for a tenant, not writing new Express routes — but the exact flow-definition format wasn't
inspected in this pass (would need a read of `flowEngine.js` + `flowConfig.js`/`flows.js` routes +
the relevant DB tables to confirm).

There's also an older, simpler `backend/src/controllers/webhookController.js` that only handles
status updates and has no tenant resolution — it looks superseded by `routes/webhook.js` and is
likely dead/legacy code, not the active path. Worth confirming before relying on it for anything.

## Key backend files (by directory)

```
backend/src/
├── app.js                          # Express app, route mounting — webhook mounted BEFORE
│                                    #   express.json()/rate-limiter (Meta sends unauthenticated)
├── config/
│   ├── database.js                 # mysql2 pool — DB_HOST/PORT/USER/PASSWORD/NAME from .env
│   └── whatsapp.js                 # WhatsApp-related config
├── middleware/
│   ├── auth.js                     # JWT auth
│   ├── rateLimiter.js
│   └── errorHandler.js
├── models/
│   ├── User.js
│   ├── Contact.js
│   ├── Campaign.js
│   └── MessageLog.js               # has updateStatusByWhatsAppId() used by legacy controller
├── controllers/
│   ├── authController.js
│   ├── campaignController.js
│   ├── contactsController.js
│   └── webhookController.js        # legacy/likely-superseded status-only handler
├── services/
│   ├── flowEngine.js                # ~28KB — the core per-tenant conversation logic, processFlow()
│   ├── whatsappConfigService.js     # getTenantByPhoneNumberId() and similar lookups
│   ├── whatsappService.js           # outbound send wrapper
│   ├── whatsappTemplateService.js   # ~10KB — template management
│   ├── messageQueue.js
│   └── csvService.js                # bulk contact import, presumably
└── routes/
    ├── webhook.js                   # ACTIVE inbound webhook handler (see above)
    ├── whatsapp.js                  # ~12KB, likely outbound send / config endpoints
    ├── campaigns.js                 # ~14KB, bulk campaign management
    ├── flows.js / flowConfig.js     # flow definition CRUD (not yet inspected in detail)
    ├── tenants.js / superadmin.js   # multi-tenant administration
    ├── leads.js / appointments.js   # real-estate-vertical specific (lead/appointment CRM)
    ├── payments.js                  # Cashfree payment gateway; credit packages: ₹999/500cr,
    │                                #   ₹3499/2000cr, ₹8499/5000cr, ₹23999/15000cr, ₹44999/30000cr
    ├── staff.js / dashboard.js / reports.js / system.js / authRoutes.js
    ├── apiKeys.js                   # JWT-protected: manage CRM API keys (vb_... prefix, SHA-256 stored)
    ├── webhookSubscriptions.js      # JWT-protected: dashboard-facing webhook subscription management
    └── v1/
        ├── credits.js               # GET /balance, /packages, /transactions
        ├── messages.js              # POST /send (template, 1cr), POST /reply (free-text, 1cr, 24hr window),
        │                            #   POST /bulk-send (template, 1cr each), GET /status/:id, /logs, /inbox
        ├── templates.js             # GET /templates, /templates/sync, POST /templates (Meta submission)
        └── webhooks.js              # API-key-protected: CRM webhook subscription CRUD + test ping
```

## Database

- Name: `whatsapp_bulk` (per `.env` `DB_NAME`, matches the dump filenames in `database/`)
- Confirmed tables referenced in code (not a full schema dump): `tenants`, `whatsapp_config`,
  `message_logs`, plus presumably `contacts`, `campaigns`, `leads`, `appointments`, `flows` /
  `flow_steps` (names inferred from models/routes, not confirmed against actual schema)
- Connection: local MySQL via Homebrew, `localhost:3306`, confirmed running on this Mac
- **Not queried in this pass** — only the code was read. A real schema dump or `SHOW TABLES` query
  was deliberately not run without the user's explicit go-ahead, since this is live infrastructure.

## CRM Integration API (v1)

Base URL: `https://vaartabot.com/api/v1/`  
Auth: `X-API-Key: vb_<key>` header on all requests (keys managed via dashboard → API Keys tab).

| Endpoint | Credits | Notes |
|---|---|---|
| `GET /credits/balance` | — | Current balance + total sent |
| `GET /credits/packages` | — | Available purchase packages |
| `GET /credits/transactions` | — | Paginated purchase/usage history |
| `POST /messages/send` | 1 | Send approved template to one recipient |
| `POST /messages/reply` | 0 | Free-text reply within 24-hr user-initiated window (no credit cost) |
| `POST /messages/bulk-send` | 1 each | Template to up to 500 recipients |
| `GET /messages/status/:id` | — | Delivery status by messageId |
| `GET /messages/logs` | — | History; filter by direction/phone |
| `GET /messages/inbox` | — | Inbound-only; filter by phone |
| `GET /templates` | — | Fetch templates from Meta |
| `GET /templates/sync` | — | Same + synced_at timestamp |
| `POST /templates` | — | Submit new template to Meta for review |
| `GET /webhooks` | — | List webhook subscriptions |
| `POST /webhooks` | — | Register callback URL (secret shown once) |
| `PATCH /webhooks/:id` | — | Update url/events/active |
| `DELETE /webhooks/:id` | — | Remove subscription |
| `POST /webhooks/:id/test` | — | Send signed test ping |

**Key rules:**
- `POST /messages/reply` uses WhatsApp's free-text (non-template) API. Meta enforces a 24-hour window from the user's last inbound message; calls outside the window return `422`.
- `LIMIT`/`OFFSET` are embedded directly in SQL strings (not prepared-statement params) to avoid a `mysql2` bug with integer type binding.
- Auto-reply flow engine (`flowEngine.js`) only runs for tenants with a row in `tenant_flow_config`; tenants without one receive inbound messages silently (no bot reply).
- Webhook push events: `message.received`, `message.delivered`, `message.read`, `message.failed`. Payloads signed with HMAC-SHA256; verify `X-Vaartabot-Signature` header.

## Open questions for next time (not yet answered)

- Which tenant_id currently owns phone_number_id `971897292671577` — is it a real paying client
  (e.g. a real-estate customer) or a Milarch-owned test/internal tenant? This matters a lot for
  whether "add a Milarch flow" is low-risk or touches a live customer's number.
- What does a flow definition actually look like (schema/format) — needed before scoping how much
  work "build the MR check-in as a Vaartabot flow" would be.
- Whether Nachiketh/Milarch Tech wants this to become a second product line (sell the multi-tenant
  platform itself to other businesses) or stay internal tooling — raised once, not yet decided.
