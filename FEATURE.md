# Opt-in crash reporting and telemetry

Branch: `feat/telemetry-sentry`  
Roadmap: **28. Sentry / PostHog integration hook**  
Status: **planned; this branch adds this specification only, not runtime functionality.**

## Features to add

- Provider adapter for main/renderer crash reporting; choose one provider for the first implementation.
- Explicit consent, **off by default**, with durable versioned preference and revocation.
- Initialize SDK/network activity only after consent; document exactly what is collected.
- Scrub tokens, user text, file paths, URL query strings, headers, and other sensitive context before transmission.
- Keep local diagnostics working when telemetry is disabled, offline, or fails.

## Implementation map

Add main/renderer provider adapters, settings consent control, redaction tests, and scoped CSP `connect-src` changes only for the selected provider. Integrate error boundary/crash events without bypassing existing fallback behavior.

## Dependencies and configuration

Optional `@sentry/electron` or PostHog SDK after a provider decision. Configure endpoints/project IDs explicitly. Build-time source-map upload tokens belong only in CI secrets and must never enter the application bundle. Do not record sessions/screenshots by default.

## Acceptance tests

- [ ] No SDK initialization, crash upload, background event, or outbound request before consent.
- [ ] Consent enables only documented events; revocation prevents future transmission.
- [ ] Redaction tests contain synthetic sensitive data and verify its removal.
- [ ] Provider outage never blocks startup, shutdown, or error handling.
- [ ] Production release IDs match uploaded source maps without embedding upload credentials.
- [ ] Network inspection confirms disabled telemetry is silent on all target systems.

## Integration

Implement the privacy policy, consent flow and provider before merging `origin/feat/telemetry-sentry`. No telemetry is enabled by this plan.
