# Frameless window and startup splash

Branch: `feat/frameless-window`  
Roadmap: **15. Custom frameless title bar · 16. Startup splash screen**  
Status: **planned; this branch adds this specification only, not runtime functionality.**

## Features to add

- Opt-in frameless BrowserWindow with a draggable title bar; interactive controls use `-webkit-app-region: no-drag`.
- Typed minimize, maximize/restore, and close requests; main validates the sender and operates only on its owning window.
- Accessible cross-platform window controls with macOS traffic-light accommodation.
- Lightweight local splash window during initialization, destroyed on ready-to-show, timeout, or startup failure.
- Subtle loading animation and fade transition, disabled for reduced motion; no artificial initialization delay.

## Implementation map

Extend `app/src/main/window.ts`, the shared IPC contract, and preload; add renderer `TitleBar`/`Splash` components and tests. Keep the existing geometry persistence, navigation protections, CSP, and updater intact.

## Dependencies and configuration

Use built-in Electron/CSS APIs. No extra packages or secrets. Make frameless mode a deliberate setting/build option; do not silently remove native accessibility behavior.

## Acceptance tests

- [ ] Minimize, maximize/restore, close, drag, resize, keyboard focus, and double-click work on Windows/macOS/Linux.
- [ ] Title controls never invoke arbitrary window IDs or channels.
- [ ] Splash closes exactly once on success; failure/timeout does not leave an orphan process.
- [ ] Tests cover transitions, error paths, and reduced motion.
- [ ] Merge alongside another optional branch without removing core settings or IPC protections.

## Integration

Implement and test before using this branch as an add-on. Once approved: fetch, merge `origin/feat/frameless-window`, run all checks, then perform native window smoke tests. See `documentation/TESTING.md`.
