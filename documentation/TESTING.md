# Testing

## Local checks

Run inside `app/`:

```bash
npm ci
npx playwright install chromium
npm run typecheck
npm test
npm run build
npm run test:ui
```

`test:ui` builds the application and serves the **production renderer** through Vite preview on `127.0.0.1:4173`, including its packaged CSP. It never reuses an unrelated existing server. Override Chromium with `CHROMIUM_PATH` if needed. Reports are written to `playwright-report/`; failed tests save screenshots and traces. CI runs the same commands and uploads failure artifacts.

For a memory-constrained development container with a system Chromium, use `PLAYWRIGHT_LOW_MEMORY=1 CHROMIUM_PATH=/path/to/chromium npm run test:ui`. This disables trace recording and limits the **test browser's** renderer process count. It does not alter Electron production sandboxing.

## Covered automatically

- URL allowlist, theme/window/file argument schemas and progress clamping.
- JSON store corruption fallback and concurrent atomic updates.
- Startup spinner and skeleton, successful initialization, failure fallback, missing bridge.
- Navigation, counter, native-file mock, toast, main-process events and persisted theme mock.
- Updater checking, available, downloading, downloaded, restart-in-progress, no-update, and error states.
- Installation rejection/retry, disabled duplicate install button, escaped error text.
- Reduced-motion CSS.
- Empty GitHub Atom feed through the real electron-updater provider with fake HTTP, event-plus-rejection handling, genuine update-error preservation, and later release discovery.
- Informational setup UI and manual-check transitions to available updates or real failures.

## Boundaries

Playwright runs the **renderer in Chromium**, not an Electron executable. Its typed fake `window.api` lives only in the test fixture. Native operations, settings persistence on disk, updater network activity, real installation, and OS keychains are not proven by these tests. Node tests exercise pure validation and the existing JSON helper, not Electron APIs.

## Native smoke checklist before release

On Windows, macOS, and Linux, verify:

1. Cold start; reopen after close; second launch focuses the existing window.
2. Window geometry/maximized state restores, including after disconnecting a monitor.
3. OS theme changes update renderer and native frame; explicit themes survive restart.
4. Open/save dialogs cancel safely and complete successfully; HTTP(S) links open in the default browser; non-web schemes and unexpected navigation remain blocked.
5. A deliberately broken renderer shows the fallback or records a crash event without exposing user data.
6. Install signed packages in an isolated environment; publish a controlled newer release; verify checking/download/restart and actual version change.
7. Verify unsupported/error/offline updater behavior and log rotation.

Do not publish a release merely because browser tests pass.
