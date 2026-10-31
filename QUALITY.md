# Gather quality review

Verified locally on 31 October 2026, including a final review after version 4. This report records measured checks and their limits; the external evaluator determines its own score.

## Final review fixes

- Capture a stable snapshot when opening an event editor. Reject a stale save when another tab has added expenses, changed guests or updated other event records. Preserve the draft and explain how to reopen the latest version.
- Compare record snapshots before saving or removing tasks, expenses, vendors or guests. Changes to unrelated records do not block a valid save. Compare JSON data independently of property insertion order.
- Bind update callbacks to their original event so a delayed callback cannot modify a newly selected event. Reset search and filter state when switching events.
- Use one compact, byte-limited serializer for saved workspaces and downloaded backups. A large valid workspace now round-trips even when indentation would have pushed the download above the 5 MB restore limit. The built app's downloaded JSON was also checked for compact formatting and preserved event/expense data.
- Add eleven regression tests. Six newly added cases reproduced the old overwrite/selection failures before the fix. The full 158-test suite now passes. A real two-tab browser check also confirms rejection, safe reopening and preservation after reload.

## Changes against the evaluation categories

| Category          | Improvements                                                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Code quality      | Separate the workspace controller, navigation, header, dialogs and individual forms. Use typed, exclusive dialog state and correlated item types. Generate Gemini's output schema from its Zod parser. Keep storage reads free of render-time side effects and reject invalid writes atomically. |
| Security          | Upgrade Zod and Cloudflare tooling to address current advisories. Retain server-only Gemini credentials, hosted identity and atomic D1 quotas. Bound body bytes and read duration, handle stalled cancellation, validate provider output and preserve browser security headers.                  |
| Efficiency        | Retain lazy-loaded screens, bounded records/history/tokens and integer-paise calculations. Snapshot the request's current day once. Cancel abandoned generation and release request readers/listeners/timers.                                                                                    |
| Testing           | Expand the suite from 85 to 158 tests across 14 files. Cover rejected writes, storage conflicts/limits, stale editors, request deadlines, modal isolation, mobile navigation, provider contracts and real SQLite quota statements. Add a GitHub Actions workflow and strengthen coverage gates.  |
| Accessibility     | Associate validation errors with controls and focus the first invalid field. Trap focus in stacked dialogs and the mobile drawer, restore triggers, isolate background content and preserve reduced motion. Fix measured text contrast, visible-label/name mismatches and mobile table overflow. |
| Problem alignment | Keep wedding, birthday and community workflows, personalized summaries, budgets, editable timelines, vendor checklists, RSVPs, ideas, backups and exports. Clearly distinguish Gemini personalization from editable built-in plans.                                                              |

## Verification evidence

- TypeScript and ESLint pass with zero lint warnings. The production Worker builds successfully.
- **158 tests pass across 14 files.** The application workflow verifies lazy navigation, exact expense amounts, persistence after remount, guest RSVP updates, concurrent editors, event-specific search state and a large backup round trip.
- Application coverage: **87.33% lines, 85.18% statements, 78.73% branches and 72.81% functions**. This includes the forms, workspace components and hooks. The planning API service retains 100% line/statement/function coverage and 95.58% branch coverage.
- Coverage gates now require 85% lines, 84% statements, 76% branches and 70% functions. The API has separate 100% line/statement/function and 95% branch gates. These percentages measure exercised code, not evaluation scores.
- Browser axe audits of all six complete desktop screens report **zero violations**, including contrast and accessible-name checks. Browser auditing found and prompted fixes to the inspiration banner and the profile/payment buttons.
- Mobile verification at a 390-pixel viewport checks the drawer's initial focus, Escape dismissal, focus restoration, destination heading focus and inert background. A blank expense amount focuses its associated error; a valid paid expense saves ₹1,234.56 and survives reload. The budget table remains horizontally scrollable within the page. A decorative hero caption is hidden on narrow screens to keep the call to action clear.
- A browser axe audit of the mobile invalid-expense dialog reports zero violations. Automated tests also cover hidden/disabled controls, nested modal focus, external focus attempts, dynamic outside content and preserved body styles.
- The built-Worker API smoke test passes for all three built-in event types, contextual budget chat, invalid JSON, validation, origin rejection and request-size limits.
- Live Gemini verification through the built Worker and local D1 on 31 October returned a validated synthetic community plan with **10 tasks, 3 ideas and 4 vendor roles**. A live conversation returned advice with the application's exact **INR 78,765.44** remaining balance. Anonymous paid requests returned HTTP 401; explicitly selected built-in mode remains available. Test identity headers were used only on loopback, never on the hosted service. Provider handling is unchanged in this final review.
- The GitHub Actions workflow runs the checks, production dependency audit, build and a credential-free built-API smoke test. A local workflow definition is not evidence of a completed remote Actions run.
- `npm audit --omit=dev` reports **zero vulnerabilities**. Environment files and runtime state remain ignored; credentials stay on the server.

## Limits and remaining findings

Browser axe reports some contrast checks as incomplete, including image/complex-background cases. Visual inspection and targeted contrast tests supplement the automated checks; they do not certify full WCAG conformance or replace assistive-technology testing.

The complete development dependency audit reports **16 moderate affected package entries**, with no high or critical findings. They share the upstream minimatch globparts-amplification advisory, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), in ESLint-related dependency chains. The patched major release is incompatible with some older consumers' callable API, so it is not forced over them. Application requests never supply patterns to the development linter. No finding is hidden, suppressed or cleared by falsely relabeling a package.

The framework emits nonfatal sourcemap and internal dynamic-import warnings during its successful build. Event plans remain device-local; cloud event synchronization is not implemented. Hosted Gemini personalization requires ChatGPT sign-in. Existing site visibility is preserved.

## Reproduce

Follow [README.md](README.md). `npm run check` runs type checking, lint and tests. `npm run test:coverage` writes the coverage report; `npm run build` creates the Worker. Start the built preview and use `npm run test:api` with `TEST_BASE_URL` if needed. That smoke test selects built-in mode and does not spend Gemini quota. Live-provider checks use synthetic event details and the separately configured server credential.
