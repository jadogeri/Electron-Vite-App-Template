# Contributing

## Getting started

Use Node.js 22+, clone the repository, then run `cd app && npm ci`. Copy `.env.example` to `.env` and launch with `npm run dev`. Read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Branching strategy

- `main`: reviewed core foundation only.
- `feat/core-foundation`: proposed core implementation and tests.
- Other `feat/*`: isolated optional feature plans; implementation status must remain explicit.
- `fix/*` and `docs/*`: narrowly scoped maintenance.

Optional branches start at the same core commit. Until core merges, compare them against `feat/core-foundation` to avoid including the core diff again. Do not merge a planning branch expecting a runnable integration.

## Quality checks

Inside `app/`, run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:ui`. Install the Playwright browser first. Keep `package-lock.json` in sync. Use Conventional Commits, such as `feat(updater): show download progress`.

## Code standards

Keep privileged operations in main. Expose only narrow, typed methods through preload. Add requests to the shared IPC contract and channel map, validate values at runtime, check the sender, and return serializable data. Never expose raw `ipcRenderer`, filesystem access, or credentials to renderer code.

Changes to native integrations need desktop smoke tests in addition to mocked browser tests. Document tested platforms and limitations; never mark planned functionality as shipped. Add or update the branch's `FEATURE.md` and roadmap entry.

## Pull requests

Explain the user-visible change, tests run, security implications, and any migration. Use the PR template. Report security problems privately following [SECURITY.md](SECURITY.md).
