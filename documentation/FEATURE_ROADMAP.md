# Feature and branch roadmap

Source: the maintainer's uploaded 30-feature Electron + Vite roadmap.

**Implementation status: Completed.** Core features 1–14 are on `main`; all ten optional branches now have real main/renderer implementations and passing automated checks, combined for review in `implementation/all-features`. **Release/native/account acceptance remains pending where listed below**: automated smoke is not certification of every OS interaction, trusted signatures or external accounts. See the per-feature evidence.

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

| Branch | Implemented scope | Remaining validation |
| --- | --- | --- |
| `feat/frameless-window` | 15 custom title bar; 16 bounded splash | Native controls/accessibility on each OS |
| `feat/system-tray` | 17 persisted tray/background preferences; 18 notification fallback | Desktop tray/permission behavior |
| `feat/command-palette` | 19 bounded shortcuts; 20 searchable keyboard palette; 21 native menus | OS shortcut conflicts and screen readers |
| `feat/sqlite-db` | 22 real better-sqlite3 + Drizzle disk CRUD/migrations | Packaged addon architecture matrix |
| `feat/auth-security` | 23 bounded OIDC callbacks; 24 protected safeStorage vault | Live provider and OS keychains/ACLs |
| `feat/offline-sync` | 25 durable bounded queue, idempotency, retry/conflict resolution | Deployed backend and physical network transitions |
| `feat/worker-process` | 26 bounded utility-process prime jobs/cancellation | Packaged native process matrix |
| `feat/i18n` | 27 persisted system/en/es locale, i18next, core/native labels | OS locale changes and translation review |
| `feat/telemetry-sentry` | 28 default-off consent, allowlisted diagnostics | Real Sentry delivery; full source-mapped native crashes not implemented |
| `feat/code-signing` | 29 fail-closed signed build/verification; 30 safe update channels | Certificate-backed signing, notarization and real installer updates |

Each optional branch has a root `FEATURE.md` and a plan/implementation/evidence document at `documentation/features/<id>.md`. Disabled-by-default integrations do not contact providers without configuration or consent.

## Branch usage

The ten branches share current main and the common feature framework. Review the integrated PR for compatibility, or select optional branches independently. See [FEATURE_INTEGRATION.md](FEATURE_INTEGRATION.md) for dependency reconciliation and merge guidance.

Once an add-on is implemented, tested, and reviewed:

```bash
git fetch origin
git switch -c my-desktop-app origin/main
git merge origin/feat/sqlite-db
cd app
npm ci
```

These branches add real runtime functionality and may add dependencies. SQLite needs an Electron-target native rebuild before launching; provider-backed features remain disabled until explicitly configured.
