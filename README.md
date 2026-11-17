# Electron + Vite App Template

A TypeScript desktop foundation built with Electron, Vite, and React. Keep universal plumbing in the core and choose optional native or opinionated features by branch.

## Quick start

Requires Node.js 22+ and a desktop OS for Electron.

```bash
git clone https://github.com/jadogeri/Electron-Vite-App-Template.git
cd Electron-Vite-App-Template/app
npm ci
cp .env.example .env
npm run dev
```

The implementation is proposed in `feat/core-foundation` until its pull request is merged into `main`. Optional branches are **planning branches, not implemented add-ons**; each contains a `FEATURE.md` with requirements, security notes, and acceptance tests. See [the roadmap](documentation/FEATURE_ROADMAP.md) for all 30 features and their status.

## Core foundation

- Tailwind CSS and Home, Dashboard, Settings hash routes.
- Light/dark/system appearance persisted through schema-validated `electron-store`.
- Renderer and main-process toast events, startup loading UI, and a React error boundary.
- Window geometry/maximized-state persistence, single-instance focus, safe HTTP(S) links.
- Rotating `electron-log` files, shared typed IPC contract, sender checks, and runtime validation.
- Production CSP, sandboxed preload, context isolation, and denied permissions by default.
- Separated main/renderer environment variables and an auto-updater with GitHub release builds.

## Commands

Run inside `app/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Launch Electron with Vite HMR |
| `npm run typecheck` | Check main, preload, renderer and tests |
| `npm test` | Run Node unit tests |
| `npm run test:ui` | Run browser UI tests with a mocked Electron bridge |
| `npm run build` | Build all application bundles |
| `npm run build:win` | Build Windows installers |
| `npm run build:mac` | Build macOS DMG/ZIP |
| `npm run build:linux` | Build Linux AppImage/DEB |

Before the first UI run, use `npx playwright install chromium`. Linux CI also needs `npx playwright install --with-deps chromium`. A system Chromium can be selected with `CHROMIUM_PATH=/path/to/chromium`.

## Loading and updates

Initialization shows a spinner and shimmer while settings/version load. The updater shows checking, preparing, determinate download progress, ready-to-install, restart-in-progress, up-to-date, and recoverable error states. All animations respect `prefers-reduced-motion`.

Installation requires an explicit **Restart & Install** click. The app then exits so the OS installer can run; the renderer does not pretend to show real post-exit installation progress. Development mode never downloads or installs updates.

If the configured GitHub repository has no published releases, the installed app shows **“Updates haven't been set up yet”**, not a failure or a false “up to date” result. Network, permissions, malformed feeds, and missing update-metadata errors remain visible. See [SUPPORT.md](SUPPORT.md).

## Release configuration

1. Set your own app ID, product name, icons, and GitHub publish repository in `app/package.json`.
2. Update the package version and lockfile together.
3. Tag the matching commit, for example `v1.1.0`.
4. The release workflow builds Windows NSIS, macOS DMG/ZIP and Linux AppImage installers and update metadata into a **draft GitHub release**.
5. Test the installers on real target systems before manually publishing the release.

Default artifacts are **unsigned**. macOS notarization and Windows trusted signing need developer accounts/certificates and are specified in `feat/code-signing`. No tag, release, or distribution is created by this PR.

## Documentation

Start at [documentation/README.md](documentation/README.md) for architecture diagrams, test scope, feature status, and release limitations. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [SUPPORT.md](SUPPORT.md).

## Licensing

No project license has been selected. Third-party packages retain their own licenses. The old repository's license has deliberately not been copied without a licensing decision.
