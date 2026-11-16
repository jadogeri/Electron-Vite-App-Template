# Core foundation

Branch: `feat/core-foundation`  
Status: implemented for review; native smoke tests and release delivery require separate target-OS validation.

## Scope

Implement roadmap features 1–14 without adding native C++ build dependencies or requiring API keys. Keep optional features 15–30 in branch-local plans. Add animation and effects for startup, checking/downloading updates, and restart-to-install; never imply that the renderer can observe installer progress after exit.

## Acceptance criteria

- Settings, routing, notifications, fallback UI, security boundaries, and window lifecycle are implemented.
- `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:ui` pass.
- Browser tests cover loading/update/error/reduced-motion states with a test-only native bridge.
- Documentation distinguishes implemented core from optional plans and browser checks from real native checks.
- `main` is changed only after pull-request review; no release tag is created.

See [the full roadmap](documentation/FEATURE_ROADMAP.md), [test guide](documentation/TESTING.md), and [contributor handbook](CONTRIBUTING.md).
