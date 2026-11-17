# Optional feature integration

The complete review branch is `implementation/all-features`. The ten original `feat/<id>` branches retain their original history and contain current main, the common framework, and their own plugin/dependencies, not ten copies of the complete suite.

The common framework is also published as `work/feature-host`. It preserves `window.api`; optional `window.features` has only `call`, `list` and event-specific `on`/unsubscribe. Plugins are discovered at build time. Missing plugins create no fake screens. A feature call must originate from a tracked primary window's main frame at the exact trusted renderer URL. Inputs and outputs are bounded, JSON-safe, schema-validated and errors sanitized.

Main factories run once before main-window creation. Window preferences cannot replace the sandboxed preload or disable isolation. Auxiliary splash windows are not updater targets or activation targets. Quit/update cleanup prevents new work, invokes all bypass hooks and awaits idempotent shutdown.

Renderer `global` and `titlebar` plugins mount once inside HashRouter. Tools are on Features; account, telemetry and channel preferences are on Settings. Native-mode users can still opt into custom window chrome. Locale adapters default to identical English strings without requiring i18next in the common host.

## Selecting branches

Review one or several `feat/<id>` branches as optional additions. Their common changes share ancestry so merge the common host once, then the desired branches. Package/lock changes from independent dependency sets can require a normal dependency reconciliation; run `npm install` and commit the resulting lock, then all checks. Do not overwrite branch histories or copy an all-features package into an unrelated optional branch.

SQLite requires a native rebuild for each Electron/OS/architecture and ASAR unpacking. Worker builds emit a fixed CJS entry after the main ESM bundle for both dev and production. Credentials, URLs and flags used by plugins belong only in the main-process runtime environment, never `VITE_*`. No provider, consent, signing key, release or deployment is configured by this implementation.

## Evidence

The review PR records exact command outcomes and CI links. Per-feature documents preserve the original acceptance scope, implemented paths, deterministic tests and unresolved native/provider checks. In particular, signing infrastructure is not proof of a trusted signature; privacy-filtered Sentry enum reporting is not full native crash/source-map coverage.
