# Signed distribution and update channels

**Status: Completed — implementation and automated checks.** Release/native/account acceptance remains pending as detailed below. The original specification is preserved in [the historical plan](code-signing-original-plan.md).

Branch-source checks: both TypeScript projects, 21 unit tests, full production build, and 1 installed-feature browser scenarios passed. Integrated suite: 91 unit tests and 37 production-browser scenarios, no skips. Windows/macOS/Linux unsigned native and packaged SQLite/utility-process smoke passed in [CI](https://github.com/jadogeri/Electron-Vite-App-Template/actions/runs/44120989994). This does not certify signing, real providers, keychains or every interactive OS behavior.

Status: channel policy/UI, fail-closed signing configuration, manual verification workflow and automated policy checks implemented. **Trusted signed distribution is not completed.** No accounts, certificates or native signed artifacts were available or used.

## Channels

`preferences.updateChannel` strictly validates `{channel:'latest'|'beta'|'alpha',prereleaseConsent:boolean}` without overwriting other settings. Invalid data falls back to latest without prereleases. Beta/alpha require explicit consent. The UI saves only on an explicit action and explains that returning to stable waits for a newer stable version rather than downgrading.

Coordinator wiring in core updater:

1. Call `configureUpdateChannels(autoUpdater)` before any checks, after the main factory initializes persisted preferences.
2. Call `updateChannelActivity(next.status)` from every state transition, including checking **before** an async request starts. Active checks/downloads/downloaded/installing states prevent channel switching.
3. Set `autoDownload=false`. On availability, call `isCandidateAllowed(app.getVersion(),info.version)` before explicitly starting a download; check again before install. Never auto-install a refused candidate.
4. Keep `allowDowngrade=false` after changing `channel` (electron-updater's setter may change it). Beta permits only beta/stable; alpha permits alpha/beta/stable; latest permits stable only. SemVer comparisons reject invalid, equal and older versions.

Main methods: `getState`, `setChannel`; event `changed`. Production dependency `semver ^7.8.6`, dev dependency `@types/semver`. Helpers in `main/features/code-signing/channels.ts` do not import renderer code.

## Signed builds

Unsigned core builds remain unchanged and must not be described as trusted distribution. Explicit signed command, from app:

`node scripts/signing/validate.cjs && npm run build && npx --no-install electron-builder --config electron-builder.signed.cjs --publish never`

The separate config requires code signing; absence of configuration or ad hoc signing fails closed. macOS uses Developer ID certificate signing, hardened runtime, bundled entitlements and electron-builder notarization/stapling. Windows signs with the supplied trusted PFX certificate, SHA-256 and RFC3161 timestamping. A self-signed certificate will not pass native trust verification.

Manual-only `.github/workflows/signed-verify.yml` uses read-only repository permission, a protected `signing-verification` environment, no tag/release publishing and no artifact upload. Set platform-specific GitHub environment secrets `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `WINDOWS_CSC_LINK`, `WINDOWS_CSC_KEY_PASSWORD`; Apple also needs `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. These map to electron-builder's `CSC_LINK`/`CSC_KEY_PASSWORD` only inside the workflow. Do not print their values or bundle certificate files. Prefer encrypted certificate URLs/base64 secrets managed by the protected environment; credentials are never requested through chat.

Validation runs before dependencies/build. Native commands verify macOS `.app` signatures/trust/stapling (`codesign --verify --deep --strict`, `spctl --assess`, `xcrun stapler validate`) and every Windows `.exe` signature/trusted certificate/timestamp (`Get-AuthenticodeSignature`). Command errors are suppressed into a safe generic failure.

## Verification

Completed automated checks: missing target signing configuration fails; ad hoc identity rejected; stable rejects prereleases; consent and coherent beta/alpha policy; SemVer upgrade-only including stable return from beta; active-operation channel guards; persistence callback failure and electron-updater downgrade-setter reset. Main/renderer TypeScript checks passed.

Pending: supply trusted certificates/account permissions; execute the signed workflow on macOS and Windows; inspect secret isolation; verify downloaded packaged artifacts on clean machines; verify Windows certificate chain/timestamp and Apple notarization/stapling; signed install-and-update smoke tests for actual target architectures; interrupted download/restart recovery and remote channel metadata. No signed artifact, release tag, release publication or live-service configuration has been performed.
