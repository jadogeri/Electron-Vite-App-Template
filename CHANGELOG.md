# Changelog

## Unreleased

### Added

- Core desktop foundation: Tailwind, hash routing, persistent OS-aware themes, toast events, error fallback, window state, single-instance lock, safe links, settings schemas, rotating logs, typed IPC, CSP, and environment example.
- Updater status snapshot and animated startup/check/download/restart UI, progress bounds, installation error recovery, and reduced-motion support.
- Node unit tests and mocked-bridge Playwright UI tests; CI validation and tagged-release installer workflow.
- Contributor/support/security handbook, architecture diagrams, and a 30-feature roadmap.
- Ten optional feature planning branches with branch-local requirements and acceptance criteria.

### Fixed

- An empty GitHub release feed now shows an informational “updates not set up” state instead of the generic startup update-check error. Both the updater error event and rejected check promise use the same classification; real update failures remain errors.
- Browser preview no longer crashes silently on a missing Electron bridge.
- Updater listeners and IPC handlers register once, including after macOS window recreation.
- Removed unrelated product metadata from the starter's HTML.

### Limitations

Optional add-ons are plans, not implemented functionality. Browser tests do not validate real OS dialogs, native themes/window state, signing, or installer delivery.
