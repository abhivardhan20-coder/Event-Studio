# Gather quality review

Verified on 23 October 2026. This report records checks and limitations; it does not predict an external evaluator's score.

## Changes against the evaluation categories

| Category          | Improvements                                                                                                                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code quality      | Split domain contracts, calculations, templates, persistence, calendar export and AI handling into focused modules. Separate each planning screen. Enforce strict TypeScript, unused-code checks and zero ESLint warnings. Validate external and stored data at runtime.                                                                          |
| Security          | Upgrade Next, React/server components, Vinext, Vite, Cloudflare tooling and vulnerable transitive dependencies. Keep Gemini credentials on the server. Require hosted identity and atomic persistent quotas for paid requests. Check origin/media type, bound streamed request bytes, validate provider output, and add browser security headers. |
| Efficiency        | Load secondary planning views on demand. Reuse formatters, calculate expenses in integer paise, and aggregate categories with a map. Bound request/history/record counts and provider tokens; support timeouts and cancellation.                                                                                                                  |
| Testing           | Add domain, persistence, SQL, API, provider, component and application-workflow tests with coverage thresholds. Exercise real SQLite quota statements across limiter instances. Test keyboard dialogs, restoration, request cancellation and Strict Mode prompt handling.                                                                         |
| Accessibility     | Add skip navigation, selected states, explicit labels/hints, table semantics, live status/error feedback, inert dialog backgrounds, focus trapping/restoration and Escape dismissal. Increase small text, improve contrast/borders/focus outlines and mobile controls, and retain reduced-motion support.                                         |
| Problem alignment | Preserve all three event types and their budget/timeline/vendor/guest/idea workflows. Display personalized summaries, restore backups, optionally shift unfinished tasks with an event date, and distinguish live Gemini from built-in guidance.                                                                                                  |

## Verification evidence

- TypeScript and ESLint: pass, with zero lint warnings.
- Production build: pass on the updated stack.
- Vitest: **85 tests pass across 8 files**. The complete app workflow verifies lazy navigation, expense persistence after remount and guest RSVP changes. A full-page structural axe audit also passes.
- Coverage of application-owned modules: **80.57% lines, 78.61% statements, 69.35% branches, 65.24% functions**. Domain modules have 99.51% line coverage; AI/server modules have 99.35%. The planning API service has 100% line/statement/function coverage and 95.58% branch coverage. This is code coverage, not an evaluation score.
- Local D1 migration: applied successfully; the quota table was confirmed after the tooling upgrade. Drizzle migration checks pass.
- Built Worker: home page returns HTTP 200. Content Security Policy and `X-Content-Type-Options` are present on the actual HTML response.
- Built Worker API smoke checks: pass for all three built-in event types, conversational budget context, invalid JSON, validation, cross-origin rejection and request-size limits.
- Live Gemini through the built Worker and local D1: a synthetic community picnic produced a validated plan with **10 tasks, 3 ideas and 4 vendor roles**. The observed request took approximately 3.3 seconds; this is a single observation, not a performance benchmark. A subsequent live conversation returned Gemini advice with the application-calculated **INR 78,765.44** remaining balance.
- Anonymous paid requests return HTTP 401. Explicit built-in mode remains available. Local-only test identity headers were used to exercise the production authorization path; no production identity was forged.
- `npm audit --omit=dev`: **0 reported vulnerabilities**. Source and generated client assets were scanned without finding a Gemini key. Environment files remain untracked. No `braces`/`micromatch` source was found in the generated deployment sourcemaps.

## Limits and remaining findings

Browser automation was denied by the browser URL policy, so this revision has no completed visual browser QA, screen-reader certification or browser-based contrast audit. Axe runs in jsdom, which lacks layout/canvas support: contrast is excluded from those automated checks. Isolated screen audits also exclude the page-region rule; the full-page audit keeps region checks enabled. The component tests do verify keyboard behavior and programmatic semantics. Typography and colors were improved in the actual styles, but automated structural checks do not establish full WCAG conformance.

The full development dependency audit still reports eight affected package entries caused by the same upstream `braces` advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The advisory lists no patched release. The affected chains are in lint/build glob tooling, and application requests do not supply glob patterns to those tools. Production dependency auditing is clean. No advisory was hidden or disabled, and package versions were not falsely relabeled to clear the audit.

The framework emits nonfatal sourcemap and internal dynamic-import warnings during its successful build. Event plans remain device-local; there is no cross-device event synchronization. Public visitors must sign in with ChatGPT for paid Gemini personalization. Existing site visibility is preserved.

## Reproduce

Use the commands in [README.md](README.md). `npm run check` covers type checking, linting and the test suite; `npm run test:coverage` writes an HTML report to `coverage/`. `npm run test:api` uses built-in mode and does not spend Gemini quota. Live-provider verification uses synthetic event details and requires the separately configured server credential.
