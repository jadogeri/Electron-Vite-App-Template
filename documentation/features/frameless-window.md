# Frameless window and startup splash

**Status: Completed — implementation and automated checks.** Release/native/account acceptance remains pending as detailed below. The original specification is preserved in [the historical plan](frameless-window-original-plan.md).

Branch-source checks: both TypeScript projects, 24 unit tests, full production build, and 2 installed-feature browser scenarios passed. Integrated suite: 91 unit tests and 37 production-browser scenarios, no skips. Windows/macOS/Linux unsigned native and packaged SQLite/utility-process smoke passed in [CI](https://github.com/jadogeri/Electron-Vite-App-Template/actions/runs/44120989994). This does not certify signing, real providers, keychains or every interactive OS behavior.

Status: **Implemented; automated checks passed; target-OS acceptance pending.**

## Implemented

- Native frames remain the default. The titlebar plugin exposes a persistent, explicit opt-in; quit and reopen applies the changed window style.
- Windows/Linux use `frame: false` only after opt-in. macOS uses `hiddenInset` with native traffic lights and an 84px titlebar clearance.
- Controls accept only minimize, maximize/restore, and close. Main resolves the requesting webContents' owning window; callers cannot supply another window ID or arbitrary method.
- Local sandboxed splash, strict CSP, no remote resources or artificial delay. Success, failed renderer load, crashed renderer, timeout, closed window, and shutdown converge on exactly-once cleanup.
- Failed/15-second-timeout startup destroys the failed main window, preventing the splash from keeping an invisible process alive. A splash construction failure leaves the main startup path intact.
- Draggable title region, no-drag interactive controls, keyboard-focusable named buttons, double-click maximize, and reduced-motion-aware loading/appearance animations.

## Host integration

No new dependencies. Import main plugin through the feature host. Consume `windowOptions` before constructing the main BrowserWindow; retain existing geometry, navigation protections, icon, preload, sandbox and CSP. Call `attachWindow` synchronously immediately after constructing the main window and **before** its load/ready-to-show. Call `beforeQuit`/`shutdown` from the host lifecycle. Render the titlebar placement even when custom frames are disabled, so the opt-in remains reachable.

Methods: `state()`, `setEnabled({ enabled: boolean })`, `control('minimize' | 'maximize' | 'close')`.

## Evidence and remaining acceptance

Completed automated checks: strict control/preference validation, each splash terminal transition, cancellation, racing-event idempotence, local isolation/CSP and reduced-motion markup. TypeScript main and renderer checks passed against shared host contract `7bf8391`. The full unit suite passed locally.

Pending Windows/macOS/Linux native smoke checks: minimize/maximize/restore/close; drag/resize/double-click; titlebar keyboard and screen-reader behavior; macOS traffic-light clearance; native splash load/crash/timeout behavior; reduced-motion visual inspection; geometry persistence and navigation protections after final host integration. This environment has no running native desktop session; tests use stateful lifecycle fakes rather than claiming those native outcomes.
