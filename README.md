# Gather

An event planning workspace for weddings, birthdays and community celebrations. React 19, strict TypeScript, Vinext/Vite, a Cloudflare Worker, Zod validation and a server-side Gemini REST integration. Photography and fonts are bundled locally.

## Run locally

Requires Node.js 24 or newer.

```powershell
npm ci --legacy-peer-deps
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_regular_speed.sql
npm run dev
```

Apply the migration once to a new local database. Do not replay it against an existing migrated database. Local preview data is separate from hosted D1. Open the Local URL printed by the server. The Sites deployment workflow applies hosted schema migrations automatically.

## Gemini

Copy `.env.example` to ignored `.env.local` and fill in `GEMINI_API_KEY`. Set `GEMINI_MODEL` to a text model available to your project (default: `gemini-3.5-flash-lite`). Restart the server after changing environment values. For hosted deployment, use Sites runtime secrets. Never put credentials in client code or commit environment files.

Public visitors can explore and create editable built-in plans. Personalized Gemini planning requires ChatGPT sign-in on the hosted site. Sign-in uses the platform's top-level navigation flow. Local development permits Gemini on loopback only; production builds do not enable this development exception. Built-in mode is explicitly labeled and never calls an LLM. Provider errors are displayed without silently substituting a template.

## Features

- Create, switch and edit wedding, birthday and community events.
- Generate and display a personalized summary, timeline, ideas and vendor role placeholders.
- Shift unfinished tasks when an event date changes; keep completed history intact.
- Manage tasks, expenses, vendor booking stages/checklists, guests, dietary/accessibility notes and RSVPs.
- Track exact amounts in paise, with paid/unpaid totals, suggested allocations and over-budget warnings. The assistant accepts the full supported expense ledger, rejects fractional-paise totals and uses integer-paise balance calculations.
- Bookmark ideas, request contextual AI advice and add follow-up tasks. Cancel an in-progress assistant response.
- Export a text plan, a standards-compliant calendar or compact JSON backup. Storage and downloaded backups use the same 5 MB byte limit. Restore backups by merging new events without replacing existing events.
- Preserve the newest unreadable save for recovery even when storage is full or later unavailable; synchronize from the current stored value when delayed cross-tab notifications arrive. Preserve unsaved work and enforce the same 5 MB limit for saved workspaces and backups.
- Keyboard dialogs with focus trapping/restoration, inert background, associated form labels/hints, status announcements, selected states, skip navigation and reduced motion.
- Separate view modules; secondary screens load on demand.

## Architecture

`lib/model.ts` defines the shared runtime and TypeScript contracts. `templates`, `budget`, `format`, `calendar`, `exports` and `state` contain pure domain operations. `persistence.ts` owns browser storage; React consumes pure, stable snapshots through `useSyncExternalStore`. Each planning screen has its own module under `components/views/`. The workspace controller owns typed navigation, exclusive dialogs and save results; components under `components/workspace/` render that state. Event, item and settings forms live in separate modules and keep failed saves open with associated field errors.

The route in `app/api/plan/route.ts` only wires Worker bindings to the testable API service. Request parsing, quotas, provider transport, schemas and deterministic guidance are separate modules in `lib/server/`. Request bodies have byte limits and a ten-second read deadline. `lib/chat-request.ts` builds contact-free payloads using the shared request limits, retaining the latest question while trimming older context to fit the UTF-8 byte limit. Provider requests use bounded token limits, cancellation and timeouts. Gemini's structured-output schema is generated from the same Zod contract that validates its response.

## Data and security

Event records remain in this browser on this device. There is no cloud event synchronization or collaboration. Backups can contain personal guest data: keep them somewhere you trust. Storage failures retain usable in-memory plans and display a persistent export reminder. If another tab changes a record while its editor is open, saving or removing the stale record is rejected; close and reopen the form to use the latest version. Event edits also protect newer expenses, tasks, vendors and guest records. Invalid backup data, duplicate IDs, unknown categories, remote idea images and excessive record counts are rejected.

The hosted paid API requires a platform-authenticated user ID and a D1 binding. An atomic SQL counter enforces 25 requests per identity per fixed ten-minute window across Worker instances. D1 stores only a SHA-256 identity hash, the counter and its expiry; no event or guest records. Paid hosted requests fail closed if persistent quota storage is unavailable. Free templates and local development use bounded in-memory counters.

Only event details, recorded spending, up to eight outstanding tasks in due-date order and up to eight recent chat turns are sent for AI help. Older turns and less urgent task context may be omitted to stay within the request byte limit; the latest question is retained. Guest records, emails and vendor contacts are excluded. Origin/media checks, streamed body limits, validated dates/money, generic upstream errors, no-store API responses and plain-text React rendering protect the request/response boundary. The hosted site's existing audience is preserved.

## Verification

```powershell
npm run check
npm run test:coverage
npm run test:api
npm run build
npm audit --omit=dev
```

`test:api` expects a local server and always exercises explicitly selected built-in plans for all three event types, validation, body size limits, origin rejection and contextual chat. `TEST_BASE_URL` overrides its default URL. It does not spend Gemini quota. The Vitest suite covers domain logic, storage failure/recovery/conflicts, the API, body-read deadlines, provider failures, real SQLite quota SQL, component interactions, rejected saves, stale editors, modal/mobile focus and the full expense/RSVP workflow. Axe checks every planning screen and key dialogs in jsdom; layout-dependent contrast is also checked separately in the real browser.

`.github/workflows/quality.yml` runs type checking, zero-warning lint, coverage, production dependency auditing, the production build and a built-Worker API smoke test on pushes to `main` and pull requests. It uses read-only repository permissions and needs no live AI credential.

Coverage reports are written to ignored `coverage/`. The maintained Sites integration and its template components are retained. `npm start` previews the production Worker locally using `.wrangler/state`.

For live Gemini in the built Worker preview, pass `npm start -- --env-file ../../.env.local` (Wrangler resolves that path from `dist/server/`). The Vite development server reads the root `.env.local` automatically.

See [QUALITY.md](QUALITY.md) for verification evidence and limits. An external evaluation score is determined by its evaluator; these checks do not certify a perfect score.

Photography: [Unsplash](https://unsplash.com). Fonts: DM Sans, Manrope and Playfair Display, bundled locally. Gemini API format: [official structured output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
