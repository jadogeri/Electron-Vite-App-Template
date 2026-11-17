# System tray and native notifications

Status: **Implemented; automated checks passed; target-OS acceptance pending.**
The source plan remains `FEATURE.md` on `feat/system-tray`.

## Implemented

- Background-running preference defaults off and persists locally. A retained Tray exists only while explicitly enabled and successfully created.
- Original embedded PNG source assets: monochrome 16px macOS template image and distinct 32px color Windows/Linux image. They bundle without an extra build copy step.
- Show/Hide/Quit native menu, click/double-click restoration of the existing main window, and hide-on-close only with an available, live Tray.
- Missing headless Linux display/session bus, invalid image, unsupported tray creation, or a destroyed Tray does not cause close-to-hide. Linux session detection is conservative; a real OS panel/status-notifier still needs native verification.
- Explicit quit and updater restart bypass hide through `beforeQuit`; shutdown removes window listeners, destroys Tray once, and closes outstanding notifications.
- Notification text is trimmed and strictly bounded (100-character title; 500-character body), with no icon/path/action/urgency injection. Native delivery requires explicit application preference plus `Notification.isSupported()`.
- Desktop OS permission/settings denial is handled through Electron's `failed` event or construction/show error, not falsely inferred from the capability probe. No renderer permission is requested.
- Unsupported/disabled/failed notifications produce an in-app live message. Notification clicks restore/focus an existing tracked main window. At most three native notifications stay live, each with a one-minute cleanup deadline.
- Notification bodies and raw backend exceptions are never logged.

## Host integration

No new dependencies. Main and global renderer plugins are discovered through the host. The renderer is global so fallback notifications are heard regardless of the current route. It also exposes background/native-notification preferences and an explicit test button.

Methods: `state()`, `preferences({background, notifications})`, `show()`, `notify({title, body})`. Event: `toast` with `{title, body}`.

The host must call `beforeQuit` before close interception on explicit app quit **and before** `autoUpdater.quitAndInstall()`; the updater may close windows before Electron emits `before-quit`. Honor `keepAlive()` when deciding whether closing all windows should exit. Main windows must be tracked separately from splash windows. Await shutdown cleanup. Preserve the normal non-background window-all-closed policy.

## Evidence and remaining acceptance

Completed automated checks: consent/capability combinations; strict notification/preferences input bounds; enabled/available background lifecycle matrix; explicit quit bypass; denied/failed notification fallback; construction error fallback; exactly-once click/close/listener cleanup; distinct native PNG signatures/dimensions. Main/renderer typecheck and local full unit suite passed.

Pending native Windows/macOS/supported Linux checks: tray menu and icon appearance; actual desktop panel availability; closing with background off; app Quit and downloaded update install after final host wiring; OS notification allow/deny/settings behavior; notification click restoration; tray/listener behavior during native window recreation. No delivered/visible OS notification is claimed from capability checks or fake-backed unit tests.
