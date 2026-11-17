# code-signing

Branch: `feat/code-signing`

Status: **Completed — implementation and automated checks.**

Release/native/account acceptance: **Pending where listed below; not implied by implementation completion.**

## Delivered

Fail-closed signing/notarization config and manual verification workflow; consented non-downgrading update channels. This branch contains current main, the common secure feature framework and only this optional plugin with its required dependency/build changes. Other optional plugin directories and dependencies are absent.

## Verified evidence

- [x] Main-process and renderer TypeScript checks passed on this branch.
- [x] All 21 branch unit tests passed.
- [x] Full production main/preload/renderer build passed.
- [x] Dependency lock portability and declared dependency reconciliation passed.
- [x] All 1 installed-feature production-browser scenarios passed on this branch; absent-plugin scenarios skipped only after checking actual source files.

The complete compatible suite separately passed **91 unit tests and all 37 production-renderer browser scenarios with no skips**. Browser bridges are transport doubles, not proof of native APIs or real providers. Actual unsigned Electron and packaged SQLite/utility-process smoke passed on Windows, macOS and Linux in [native CI](https://github.com/jadogeri/Electron-Vite-App-Template/actions/runs/44120989994); this integrated evidence is not a claim that this branch passed every native acceptance item.

## Remaining release acceptance

Certificate-backed trusted signatures, Apple notarization and a real signed installer update. These items remain explicit release checks. No main merge, tag or release was created.

## Traceability

- [Implementation, security boundaries, tests and remaining acceptance](documentation/features/code-signing.md)
- [Original historical specification](documentation/features/code-signing-original-plan.md)
- [Complete integration review](https://github.com/jadogeri/Electron-Vite-App-Template/pull/3)
- [Selecting optional branches](documentation/FEATURE_INTEGRATION.md)
