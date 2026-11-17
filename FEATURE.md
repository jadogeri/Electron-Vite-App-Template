# System tray and native notifications

Branch: `feat/system-tray`  
Roadmap: **17. System tray / minimize-to-tray · 18. Native OS notifications**  
Status: **implemented for review; target-OS and external-account acceptance is separate.**

## Implemented scope from the original plan

- Retained main-process Tray instance with platform-appropriate icon assets.
- Show/Hide/Quit menu and double-click restoration.
- Explicit background-running preference; closing hides only when enabled and supported.
- Native Notification wrapper with validated, bounded text and capability checks.
- Notification clicks restore/focus the existing window; unsupported environments receive a renderer toast fallback.

## Implementation map

Add `app/src/main/tray.ts` and `notifications.ts`; extend settings schemas, lifecycle, and the narrow shared IPC contract. Ensure app quit, updater restart, and tray hide cannot block one another.

## Dependencies and permissions

Built-in Electron APIs. Supply distinct monochrome/template macOS tray assets. Respect OS notification permission and user intent; do not request unrelated renderer permissions.

## Acceptance tests

- [ ] Tray menu works on Windows, macOS, and supported Linux desktop environments.
- [ ] Closing with background mode off still quits as documented.
- [ ] Explicit Quit/update install bypasses hide-on-close.
- [ ] Tray and listeners are destroyed once during shutdown/window recreation.
- [ ] Notification unsupported/denied/click paths have automated fakes plus native smoke checks.
- [ ] Notification content is not written to diagnostic logs.

## Integration

Do not treat this plan as a working tray implementation. Implement, run core checks, then merge `origin/feat/system-tray` into the target app after review.


## Implementation and evidence

This branch now contains current main, the shared validated plugin framework, and only the system-tray implementation with its required dependencies. It is not an all-features snapshot.

See [plan, implementation, tests and remaining acceptance](documentation/features/system-tray.md). The integrated suite passed combined main/renderer typechecks, 91 unit tests (including real Node SQLite), and a full production build. Browser and native/package CI outcomes are recorded separately in the integration PR; do not infer a target-OS/provider/signature result from unit tests.

The original acceptance checklist above is retained as release validation, not falsely checked off. No main merge, tag or release was made.
