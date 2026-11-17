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

Playwright runs the **renderer in Chromium**, not an Electron executable. Test-only `window.api` and optional `window.features` doubles exercise the real renderer components, routing, accessibility labels, errors, privacy and listener cleanup. They do not prove native dialogs, OS keychains, tray behavior or provider delivery. Node tests additionally execute real better-sqlite3/Drizzle disk CRUD, migration rollback and reopen; queue tests use deterministic HTTP/clock fakes and worker-manager tests use controlled child transports.

## Native data and process checks

Run Node unit tests **before** rebuilding the addon for Electron. The two runtimes use different native ABIs:

```bash
npm ci
npm test
npm run build
npm run native:rebuild
npm run test:native
npx electron-builder --dir --publish never
npm run test:packaged
```

Linux CI uses `xvfb-run -a` for the native commands. The unsigned native matrix runs on Windows, macOS and Linux. It checks actual Electron-loaded SQLite disk CRUD/rollback/reopen and actual built utility-process progress/result/termination; packaged mode loads the addon from the packaged application and exercises the packaged worker path. The explicit `--native-smoke` CLI mode uses temporary data only, never a renderer IPC method or the user's database. Passing this smoke does not certify installation, signing, protocol registration, desktop tray integration or real providers.

To return to Node tests after Electron native rebuild, run `npm rebuild better-sqlite3` for the host Node ABI first. For fresh development installs, `npm ci` builds the host addon; `npm run native:rebuild` prepares Electron.

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
