# Historical specification — not current status

This is the original branch plan, preserved for acceptance traceability. Statements below describe the pre-implementation branch and are not current instructions or completion claims. See the current root FEATURE.md and implementation evidence document.

---

# Code signing, notarization and updater channels

Branch: `feat/code-signing`  
Roadmap: **29. Trusted distribution signing · 30. latest/beta/alpha update channels**  
Status: **planned; this branch adds this specification only, not runtime functionality.**

## Features to add

- macOS Developer ID signing, hardened runtime, entitlements, notarization and stapling.
- Windows trusted signing configured through supported electron-builder tooling and a signing identity/certificate service.
- Validate platform artifacts before publication; signing failure must fail the release rather than silently produce unsigned files.
- Persist `latest`/`beta`/`alpha` preference in schema-validated settings and apply it before checking for updates.
- Explicit prerelease consent, coherent version/channel metadata and safe stable-channel return behavior.

## Implementation map

Extend electron-builder config, CI release matrix and secrets, main settings/updater, shared channel schema and Settings UI. Keep signed configuration opt-in until credentials are configured; never add placeholder certificate values to source.

## Required accounts and secrets

Apple Developer membership/signing identity/notarization access and a Windows signing identity/provider. Use GitHub encrypted secrets for signing material and source-map/signing tokens. Document names and presence only, never values. No credentials are required or requested by this planning branch.

## Acceptance tests

- [ ] macOS `codesign`/`spctl` and stapler validation succeed on downloaded artifacts.
- [ ] Windows signature chain/timestamp verifies on a clean machine.
- [ ] Missing signing configuration fails the signed-release workflow clearly.
- [ ] Stable clients never receive prerelease versions without consent.
- [ ] Channel changes, interrupted downloads and returning to stable obey explicit downgrade policy.
- [ ] Signed install-and-update smoke tests pass on actual target OS/architectures.
- [ ] Signing secrets and private keys do not appear in logs, bundles, or uploaded artifacts.

## Integration

Implement platform credentials/configuration and channel tests before merging `origin/feat/code-signing`. Default core release artifacts remain unsigned; this plan does not confer notarization or trusted signing.
