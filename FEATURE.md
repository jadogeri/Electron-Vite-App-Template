# Common optional feature framework

Branch: `work/feature-host`  
Status: implemented shared framework for independently selected feature branches; no optional plugin or provider is included here.

## Scope

Keeps current main and the updater empty-feed fix. Adds trusted bounded feature IPC, explicit main-window tracking, optional renderer slots, early authentication callback capture, lifecycle cleanup, English-default localization adapters and optional update/menu integration. No SQLite/Sentry/i18next/auth dependency is needed without selecting its feature.

## Acceptance criteria

- Settings, routing, notifications, fallback UI, security boundaries, and window lifecycle are implemented.
- `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:ui` pass.
- Browser tests cover loading/update/error/reduced-motion states with a test-only native bridge.
- Documentation distinguishes implemented core from optional plans and browser checks from real native checks.
- `main` is changed only after pull-request review; no release tag is created.

See [the full roadmap](documentation/FEATURE_ROADMAP.md), [test guide](documentation/TESTING.md), and [contributor handbook](CONTRIBUTING.md).
