# auth-security

Branch: `feat/auth-security`

Status: **Completed — implementation and automated checks.**

Release/native/account acceptance: **Pending where listed below; not implied by implementation completion.**

## Delivered

Public OIDC PKCE/state/nonce/JWKS validation, bounded native callbacks and main-only safeStorage ciphertext. This branch contains current main, the common secure feature framework and only this optional plugin with its required dependency/build changes. Other optional plugin directories and dependencies are absent.

## Verified evidence

- [x] Main-process and renderer TypeScript checks passed on this branch.
- [x] All 37 branch unit tests passed.
- [x] Full production main/preload/renderer build passed.
- [x] Dependency lock portability and declared dependency reconciliation passed.
- [x] All 7 installed-feature production-browser scenarios passed on this branch; absent-plugin scenarios skipped only after checking actual source files.

The complete compatible suite separately passed **91 unit tests and all 37 production-renderer browser scenarios with no skips**. Browser bridges are transport doubles, not proof of native APIs or real providers. Actual unsigned Electron and packaged SQLite/utility-process smoke passed on Windows, macOS and Linux in [native CI](https://github.com/jadogeri/Electron-Vite-App-Template/actions/runs/44120989994); this integrated evidence is not a claim that this branch passed every native acceptance item.

## Remaining release acceptance

Live provider login/revocation, packaged callback registration, native keychains and Windows NTFS ACLs. These items remain explicit release checks. No main merge, tag or release was created.

## Traceability

- [Implementation, security boundaries, tests and remaining acceptance](documentation/features/auth-security.md)
- [Original historical specification](documentation/features/auth-security-original-plan.md)
- [Complete integration review](https://github.com/jadogeri/Electron-Vite-App-Template/pull/3)
- [Selecting optional branches](documentation/FEATURE_INTEGRATION.md)
