# Gather quality review

Verified locally on 1 November 2026, including storage and currency-contract reviews. Earlier browser and live-provider checks are dated below. This report records measured checks and their limits; the external evaluator determines its own score.

## Currency-contract review

- Derive the assistant's spending limit from the maximum expense amount and record count. A valid 500-record ledger can exceed the assistant's former independent cap; that ledger now remains usable in budget conversations.
- Share currency validation between event amounts and recorded-spending requests. Reject fractional-paise totals before consuming quota, while accepting representational floating-point residue.
- Calculate the assistant's available balance in integer paise so tiny floating-point differences cannot produce a misleading zero-rupee over-budget message.
- Add six contract tests covering complete ledgers at the maximum, the final paise, invalid precision, excessive totals and floating-point residue. Five cases reproduced failures in the previous implementation; all six now pass. The complete suite passes 186 tests across 17 files.
- Verify the same four currency boundaries against the built Worker. A browser conversation returns the sample ledger's exact ₹4,76,000 available balance with no console errors.

## Final storage review

- Read the current browser-storage value when receiving a storage notification. Delayed notifications for an earlier save or clear cannot replace a newer stored workspace with old event data.
- Keep the latest unreadable save available in memory before attempting to write its recovery slot. The recovery download returns that newest original even when an older recovery copy exists, the storage quota is full or storage access is later denied.
- Add five regression tests; all five failed against the previous implementation and pass after the fixes. The complete suite now passes 180 tests across 16 files.
- Verify two real browser tabs at an isolated local origin: a workspace-name change appears in the second tab and remains correct after reload. No live event records were changed during this check.

## Assistant reliability fixes

- Recognize natural balance and expense questions, including “How much do I have left?”, and display the app's exact budget figures. Keep unrelated “lifesaver” themes and save-the-date ideas out of the budget branch.
- Send the earliest eight unfinished tasks to the assistant, including urgent tasks added at the end of a timeline. Built-in next-step advice also sorts by due date before choosing its first three tasks.
- Share request limits between browser and server. Bound the serialized UTF-8 request size, including JSON escape expansion; keep the latest question and discard older conversation pairs or less urgent task context as needed. Guest and vendor contacts remain excluded.
- Add seventeen regression tests, including a long multilingual conversation passed through the real request parser and API service. Six guidance cases reproduced the earlier failures before the fix. That review increased the suite to 175 passing tests.
- Browser verification confirms a correct balance response and inclusion of an appended urgent task. The rendered assistant conversation has zero axe violations and no console errors. A live Gemini check through the built Worker and local D1 also returns the exact INR 78,765.44 remaining balance using the new request builder.

## Storage and workspace fixes

- Capture a stable snapshot when opening an event editor. Reject a stale save when another tab has added expenses, changed guests or updated other event records. Preserve the draft and explain how to reopen the latest version.
- Compare record snapshots before saving or removing tasks, expenses, vendors or guests. Changes to unrelated records do not block a valid save. Compare JSON data independently of property insertion order.
- Bind update callbacks to their original event so a delayed callback cannot modify a newly selected event. Reset search and filter state when switching events.
- Use one compact, byte-limited serializer for saved workspaces and downloaded backups. A large valid workspace now round-trips even when indentation would have pushed the download above the 5 MB restore limit. The built app's downloaded JSON was also checked for compact formatting and preserved event/expense data.
- Add eleven regression tests. Six newly added cases reproduced the old overwrite/selection failures before the fix. That review increased the suite to 158 passing tests. A real two-tab browser check also confirms rejection, safe reopening and preservation after reload.

## Changes against the evaluation categories

| Category          | Improvements                                                                                                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code quality      | Separate the workspace controller, navigation, header, dialogs and individual forms. Use typed, exclusive dialog state and correlated item types. Generate Gemini's output schema from its Zod parser. Keep storage reads free of render-time side effects and reject invalid writes atomically.                    |
| Security          | Upgrade Zod and Cloudflare tooling to address current advisories. Retain server-only Gemini credentials, hosted identity and atomic D1 quotas. Bound body bytes and read duration, handle stalled cancellation, validate provider output and preserve browser security headers.                                     |
| Efficiency        | Retain lazy-loaded screens, bounded records/history/tokens and integer-paise calculations. Snapshot the request's current day once. Cancel abandoned generation and release request readers/listeners/timers.                                                                                                       |
| Testing           | Expand the suite from 85 to 186 tests across 17 files. Cover rejected writes, storage conflicts/limits, stale editors, request deadlines, currency contracts, modal isolation, mobile navigation, provider contracts and real SQLite quota statements. Add a GitHub Actions workflow and strengthen coverage gates. |
| Accessibility     | Associate validation errors with controls and focus the first invalid field. Trap focus in stacked dialogs and the mobile drawer, restore triggers, isolate background content and preserve reduced motion. Fix measured text contrast, visible-label/name mismatches and mobile table overflow.                    |
| Problem alignment | Keep wedding, birthday and community workflows, personalized summaries, budgets, editable timelines, vendor checklists, RSVPs, ideas, backups and exports. Clearly distinguish Gemini personalization from editable built-in plans.                                                                                 |

## Verification evidence

- TypeScript and ESLint pass with zero lint warnings. The production Worker builds successfully.
- **186 tests pass across 17 files.** The suite verifies lazy navigation, exact amounts, ledger/API currency limits, persistence, RSVP updates, concurrent editors, queued storage events, recovery under storage failures, event-specific search, large backups, question interpretation, task priority and bounded multilingual requests.
- Application coverage: **87.71% lines, 85.58% statements, 78.93% branches and 73.20% functions**. This includes the forms, workspace components, hooks and request builder. The planning API service retains 100% line/statement/function coverage and 95.58% branch coverage.
- Coverage gates now require 85% lines, 84% statements, 76% branches and 70% functions. The API has separate 100% line/statement/function and 95% branch gates. These percentages measure exercised code, not evaluation scores.
- Browser axe audits on 31 October of all six complete desktop screens report **zero violations**, including contrast and accessible-name checks. Browser auditing found and prompted fixes to the inspiration banner and the profile/payment buttons. The final storage changes do not alter their markup or styles.
- Mobile verification at a 390-pixel viewport checks the drawer's initial focus, Escape dismissal, focus restoration, destination heading focus and inert background. A blank expense amount focuses its associated error; a valid paid expense saves ₹1,234.56 and survives reload. The budget table remains horizontally scrollable within the page. A decorative hero caption is hidden on narrow screens to keep the call to action clear.
- A browser axe audit of the mobile invalid-expense dialog reports zero violations. Automated tests also cover hidden/disabled controls, nested modal focus, external focus attempts, dynamic outside content and preserved body styles.
- The built-Worker API smoke test passes for all three built-in event types, contextual budget chat, invalid JSON, validation, origin rejection and request-size limits.
- Live Gemini verification through the built Worker and local D1 on 31 October returned a validated synthetic community plan with **10 tasks, 3 ideas and 4 vendor roles**. A fresh live conversation using the new payload builder returned advice with the application's exact **INR 78,765.44** remaining balance. Anonymous paid requests return HTTP 401; explicitly selected built-in mode remains available. Test identity headers were used only on loopback, never on the hosted service.
- The GitHub Actions workflow runs the checks, production dependency audit, build and a credential-free built-API smoke test. A local workflow definition is not evidence of a completed remote Actions run.
- `npm audit --omit=dev` reports **zero vulnerabilities**. Environment files and runtime state remain ignored; credentials stay on the server.

## Limits and remaining findings

Browser axe reports some contrast checks as incomplete, including image/complex-background cases. Visual inspection and targeted contrast tests supplement the automated checks; they do not certify full WCAG conformance or replace assistive-technology testing.

The complete development dependency audit reports **16 moderate affected package entries**, with no high or critical findings. They share the upstream minimatch globparts-amplification advisory, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), in ESLint-related dependency chains. The patched major release is incompatible with some older consumers' callable API, so it is not forced over them. Application requests never supply patterns to the development linter. No finding is hidden, suppressed or cleared by falsely relabeling a package.

The framework emits nonfatal sourcemap and internal dynamic-import warnings during its successful build. Event plans remain device-local; cloud event synchronization is not implemented. Hosted Gemini personalization requires ChatGPT sign-in. Existing site visibility is preserved.

## Reproduce

Follow [README.md](README.md). `npm run check` runs type checking, lint and tests. `npm run test:coverage` writes the coverage report; `npm run build` creates the Worker. Start the built preview and use `npm run test:api` with `TEST_BASE_URL` if needed. That smoke test selects built-in mode and does not spend Gemini quota. Live-provider checks use synthetic event details and the separately configured server credential.
