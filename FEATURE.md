# telemetry-sentry

Branch: `feat/telemetry-sentry`

Status: **Completed — implementation and automated checks.**

Release/native/account acceptance: **Pending where listed below; not implied by implementation completion.**

## Delivered

Default-off versioned consent, main-only Sentry initialization and allowlisted error-code diagnostics. This branch contains current main, the common secure feature framework and only this optional plugin with its required dependency/build changes. Other optional plugin directories and dependencies are absent.

## Verified evidence

- [x] Main-process and renderer TypeScript checks passed on this branch.
- [x] All 22 branch unit tests passed.
- [x] Full production main/preload/renderer build passed.
- [x] Dependency lock portability and declared dependency reconciliation passed.
- [x] All 1 installed-feature production-browser scenarios passed on this branch; absent-plugin scenarios skipped only after checking actual source files.

The complete compatible suite separately passed **91 unit tests and all 37 production-renderer browser scenarios with no skips**. Browser bridges are transport doubles, not proof of native APIs or real providers. Actual unsigned Electron and packaged SQLite/utility-process smoke passed on Windows, macOS and Linux in [native CI](https://github.com/jadogeri/Electron-Vite-App-Template/actions/runs/44120989994); this integrated evidence is not a claim that this branch passed every native acceptance item.

## Remaining release acceptance

Real Sentry account delivery; full source-mapped native crashes are not implemented or claimed. These items remain explicit release checks. No main merge, tag or release was created.

## Traceability

- [Implementation, security boundaries, tests and remaining acceptance](documentation/features/telemetry-sentry.md)
- [Original historical specification](documentation/features/telemetry-sentry-original-plan.md)
- [Complete integration review](https://github.com/jadogeri/Electron-Vite-App-Template/pull/3)
- [Selecting optional branches](documentation/FEATURE_INTEGRATION.md)
