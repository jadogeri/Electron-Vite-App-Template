# Integrated optional desktop features

Branch: `implementation/all-features`  
Status: **Completed — all ten implementations and automated checks.** Clean-install main/renderer typechecks, 91 unit tests, full production build and all 37 production-browser scenarios passed with no skips. Actual unsigned Electron and packaged SQLite/utility-process smoke passed on Windows, macOS and Linux. Real credentials, trusted signatures and manual OS acceptance remain separate pending release work.

## Scope

Implements the ten original optional branches using independently discovered main/renderer plugins and a narrow validated bridge. Includes titlebar/splash, tray/notifications, command palette/context menus, SQLite/Drizzle, OIDC/safeStorage, offline synchronization, utility-process work, i18next localization, privacy-gated Sentry and fail-closed signing/update channels. Native SQLite is intentionally included only when its optional branch is selected.

## Acceptance criteria

- Keep existing core API and updater empty-feed behavior compatible.
- Validate trusted main-window senders, methods, schemas, sizes and serializable data; sanitize feature failures.
- Apply plugin options before window construction and attach immediately; use explicit tracked main windows.
- Drain bounded early authentication callbacks; await shutdown and bypass close-to-tray before update installation.
- Separate browser transport doubles, actual Node SQLite tests and Electron native/package smoke evidence.
- Do not merge `main`, tag or publish a release in this change.

See [the full roadmap](documentation/FEATURE_ROADMAP.md), [test guide](documentation/TESTING.md), and [contributor handbook](CONTRIBUTING.md).
