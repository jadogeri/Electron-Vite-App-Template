# Code signing, notarization and updater channels

Branch: `feat/code-signing`  
Roadmap: **29. Trusted distribution signing · 30. latest/beta/alpha update channels**  
Status: **implemented for review; target-OS and external-account acceptance is separate.**

## Implemented scope from the original plan

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


## Implementation and evidence

This branch now contains current main, the shared validated plugin framework, and only the code-signing implementation with its required dependencies. It is not an all-features snapshot.

See [plan, implementation, tests and remaining acceptance](documentation/features/code-signing.md). The integrated suite passed combined main/renderer typechecks, 91 unit tests (including real Node SQLite), and a full production build. Browser and native/package CI outcomes are recorded separately in the integration PR; do not infer a target-OS/provider/signature result from unit tests.

The original acceptance checklist above is retained as release validation, not falsely checked off. No main merge, tag or release was made.
