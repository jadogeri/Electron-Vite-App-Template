# Feature and branch roadmap

Source: the maintainer's uploaded 30-feature Electron + Vite roadmap.

**Status:** features 1–14 have core code in `feat/core-foundation`, proposed for `main`. The ten optional branches below contain specifications only; features 15–30 are **planned, not implemented**. This distinction is intentional and must stay visible until each add-on has code and native validation.

## Core (target: `main`)

| # | Feature | Implementation |
| --- | --- | --- |
| 1 | Tailwind CSS | PostCSS/Tailwind config and utilities |
| 2 | Multi-page routing | HashRouter Home/Dashboard/Settings |
| 3 | Light/dark/system theme | Settings + nativeTheme + renderer media changes |
| 4 | Toast notifications | React provider + main event |
| 5 | Error/crash fallback | React boundary + main fatal error dialog/log/exit |
| 6 | Window persistence | Bounds/maximized state + off-screen recovery |
| 7 | Single instance | Lock + focus/restore handler |
| 8 | External links | HTTP(S)-only URL validation + denied popups |
| 9 | Typed settings | electron-store + Zod schemas |
| 10 | Structured logger | electron-log rotation and event codes |
| 11 | Typed IPC | Shared request/response contract + narrow preload |
| 12 | CSP | Production header policy + dev-only HMR exceptions |
| 13 | Environment management | `.env.example`, VITE vs MAIN_VITE separation |
| 14 | Updater and releases | Event states, explicit install, tagged three-OS build workflow |

Implementation is not equivalent to verification on every OS. See [TESTING.md](TESTING.md). Code signing, notarization, real installer delivery, and CI execution require separate validation.

## Optional branches

| Branch | Features to add | Status |
| --- | --- | --- |
| `feat/frameless-window` | 15 custom title bar; 16 startup splash | Plan only |
| `feat/system-tray` | 17 tray/minimize-to-tray; 18 native notifications | Plan only |
| `feat/command-palette` | 19 keyboard shortcuts; 20 command palette; 21 context menu | Plan only |
| `feat/sqlite-db` | 22 better-sqlite3 + Drizzle | Plan only |
| `feat/auth-security` | 23 deep links; 24 safeStorage credentials | Plan only |
| `feat/offline-sync` | 25 connectivity and sync queue | Plan only |
| `feat/worker-process` | 26 utility-process CPU tasks | Plan only |
| `feat/i18n` | 27 locale detection + i18next | Plan only |
| `feat/telemetry-sentry` | 28 opt-in crash reporting | Plan only |
| `feat/code-signing` | 29 signing/notarization; 30 updater channels | Plan only |

Each optional branch has a root `FEATURE.md` describing scope, likely files, dependency/secret requirements, security boundaries, and testable acceptance criteria.

## Branch usage

The ten branches share the proposed core commit. Review the core PR first. After core merges, optional branch changes can be reviewed independently against `main`. Until then, compare against `feat/core-foundation`.

Once an add-on is implemented, tested, and reviewed:

```bash
git fetch origin
git switch -c my-desktop-app origin/main
git merge origin/feat/sqlite-db
cd app
npm ci
```

**Today these merges add documentation only.** They do not install SQLite, Sentry, auth, or any other optional runtime feature.
