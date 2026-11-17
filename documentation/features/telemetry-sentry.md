# Optional Sentry error-category reporting

**Status: Completed — implementation and automated checks.** Release/native/account acceptance remains pending as detailed below. The original specification is preserved in [the historical plan](telemetry-sentry-original-plan.md).

Branch-source checks: both TypeScript projects, 22 unit tests, full production build, and 1 installed-feature browser scenarios passed. Integrated suite: 91 unit tests and 37 production-browser scenarios, no skips. Windows/macOS/Linux unsigned native and packaged SQLite/utility-process smoke passed in [CI](https://github.com/jadogeri/Electron-Vite-App-Template/actions/runs/44120989994). This does not certify signing, real providers, keychains or every interactive OS behavior.

Status: privacy controls, provider adapter and automated policy tests implemented. Live provider, network-inspection and target-OS acceptance pending. No live events were sent during development.

## Consent and data

Off by default. `preferences.telemetryConsent` must strictly equal `{version:1,enabled:true}` before the SDK is dynamically imported. Missing, invalid or old consent is disabled. No endpoint is configured by source. `SENTRY_DSN` is optional main-process configuration; never expose it in renderer UI/logs. No signing/source-map upload credentials belong in the application.

The settings plugin explains the policy before the checkbox. Enabling persists explicit versioned consent; withdrawing changes the in-memory gate immediately, aborts active HTTP requests, blocks queued sends, and closes without intentionally flushing. Requests already received upstream cannot be recalled. Provider failure does not block application startup, local diagnostics or fallback UI.

Reports contain an allowlisted category (`renderer-boundary`, `renderer-unhandled`, `main-unhandled`, `renderer-crashed`), level and sanitized application release. Sentry adds protocol metadata such as SDK identity, event identifiers and envelope transmission time; the provider necessarily sees the connection IP. No user ID or pseudonymous installation ID is supplied.

The adapter rebuilds an event from this allowlist instead of attempting to redact arbitrary nested text. It discards raw messages/stacks, paths, source context, URLs, headers/tokens, user text, breadcrumbs, attachments and scope extras. Sentry default integrations are disabled, including native minidumps, screenshot capture, preload injection, sessions and automatic HTTP instrumentation. Tracing, logs and metrics are dropped. Renderer Sentry IPC/protocol input is disabled; only the host's trusted and bounded enum bridge is used. There are no analytics, session replay or recordings.

This privacy-first choice intentionally reports error categories, **not full native crash dumps or source-mapped stacks**. Full crash diagnostics/source-map acceptance from the original plan is therefore pending a separately consented policy and deployment, not silently declared complete.

## Integration

Production dependency: `@sentry/electron ^8.4.0` (verified with Electron 35-compatible SDK interfaces). The v8 SDK uses `dataCollection`, not older `sendDefaultPii` options. Main externalization must retain the package. Renderer does not initialize Sentry or contact its endpoint: retain restrictive renderer `connect-src 'self'`; no CSP broadening is required.

Main auto-observes `uncaughtExceptionMonitor` and `render-process-gone` without changing existing error handling. Core ErrorBoundary should call exported renderer `reportRendererError(bridge,'renderer-boundary')`; an optional global handler can send `'renderer-unhandled'` without passing the error/event. Methods `getState`, `setConsent({version:1,enabled})`, `reportRendererError(enum)`; event `changed`. Do not send a test event as a side effect of consent.

## Verification

Completed automated checks: strict versioned default-off policy; nested synthetic secret/path/URL/header/user-text/breadcrumb removal; no provider load before consent; revocation, delayed SDK initialization race and provider failure isolation. Main/renderer TypeScript checks passed.

Pending: inspect zero network activity before consent and after revocation on every OS; live endpoint outage and in-flight cancellation under real SDK load; actual crash-event observation; release/source-map agreement if stack reporting is ever separately approved. No source-map upload token or upload workflow is configured by this implementation.
