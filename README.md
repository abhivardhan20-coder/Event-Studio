# Gather

A complete celebration workspace for weddings, birthdays, and community events. Built with React 19, TypeScript, Vinext, and a server-side Gemini REST integration. The interface uses sage, warm ivory, terracotta, editorial typography, and locally bundled photography and fonts.

## Run locally

Requires Node.js 22.13 or newer.

```powershell
npm ci
npm run dev
```

Open the Local URL printed by the server (normally `http://127.0.0.1:5173`). On machines whose npm shell shim fails, invoke npm's installed JavaScript entrypoint directly; dependencies are already installed in this workspace.

## Enable Gemini

1. Create a key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env.local` and fill in `GEMINI_API_KEY` locally. Never commit or paste your key into browser code.
3. Set `GEMINI_MODEL` to a text model available to your Google project. The default (`gemini-3.5-flash-lite`) was selected from the account’s live model catalog for fast, efficient planning.
4. Restart the development server. Settings will display “Connected.”

For a hosted Sites deployment, configure `GEMINI_API_KEY` as a secret runtime environment variable and optionally `GEMINI_MODEL`, then redeploy. Cloudflare also supports an ignored `.dev.vars` file for local Worker bindings. The server reads Worker bindings first and local process environment second.

No key is needed to explore the app: a clearly labeled built-in mode creates type-specific templates and contextual planning guidance. This mode uses deterministic templates; it does not call an LLM. Live Gemini generation includes a personalized plan and context-aware assistant conversation. Provider errors are shown explicitly rather than silently substituted with template output.

## What works

- Create and switch between events; edit event details, budget and guest target.
- Generate personalized timelines, ideas and vendor role placeholders.
- Create, edit, delete and complete tasks; filter timeline; export an ICS calendar.
- Record and edit categorized expenses; toggle paid status; view actual spending, available funds, suggested allocations and over-budget warnings.
- Track vendor contacts, quotes, booking stages and four-step checklists. Vendor quotes are separate from recorded expenses.
- Manage guests, groups, dietary/accessibility notes and RSVPs; search and filter the guest list.
- Explore ideas, bookmark them, view details, and ask the assistant for help.
- Download a complete text plan or JSON backup; customize the workspace name.
- Responsive mobile navigation, keyboard focus styles, reduced motion support, labeled forms and dialogs with focus management.

## Data and security

Event data is validated and versioned in browser local storage. This is a single-device workspace; it does not include cloud synchronization or collaboration. Clearing browser data removes local plans. Export a copy when needed. JSON backups are provided for safekeeping; the UI does not currently restore them.

Only sanitized event context, total recorded spending, a short task list and the last eight chat turns are sent to Gemini when a user requests AI help. Guest records, emails and vendor contacts are excluded. AI output is rendered as plain React text. API keys never reach the client bundle.

The API validates requests with Zod, limits request bodies and chat history, rejects cross-origin requests, uses provider timeouts, and avoids exposing upstream errors. New Sites are private. Rate limits are best-effort per Worker isolate (25 requests per 10 minutes per identity); a public, multi-instance launch should use a shared limiter and authenticated authorization.

## Verification

```powershell
npm run typecheck
npm test
npm run test:api
npm run build
```

`test:api` expects the development server to be running. It checks validation, cross-origin rejection, body size limits, all event types and built-in conversational context. It skips live Gemini generation when a key is configured. Browser checks cover event creation, task completion, expense accounting, guest creation, bookmarks, assistant responses and the mobile layout. Live Gemini plan generation and an in-app conversation were also verified with the configured server credential. Numerical budget snapshots are calculated by application code; Gemini provides the accompanying planning advice.

The production build targets a Cloudflare Worker using the retained Sites build integration. `npm start` previews the built Worker locally. The source and the deployment manifest are under `.openai/hosting.json`.

Photography: [Unsplash](https://unsplash.com). Fonts: DM Sans, Manrope, Playfair Display via Google Fonts, bundled locally. Gemini API shape verified against [Google’s structured output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
