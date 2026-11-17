# Deep links and encrypted credential storage

Branch: `feat/auth-security`  
Roadmap: **23. Custom protocol / deep links · 24. Electron safeStorage credentials**  
Status: **implemented for review; target-OS and external-account acceptance is separate.**

## Implemented scope from the original plan

- Register an application-specific URL scheme and handle macOS `open-url` plus Windows/Linux launch/second-instance arguments.
- Queue validated callbacks until the main window is ready, then complete a single pending OAuth flow.
- Browser-based OAuth authorization-code flow with PKCE, random state, expiry, and replay protection.
- Encrypt tokens with main-process `safeStorage`; persist only ciphertext under userData with restrictive file permissions.
- Narrow session/status/logout methods; do not expose refresh tokens or plaintext credential reads to renderer.

## Implementation map

Add protocol parsing and callback tests, main auth/session modules, schema-validated IPC, packaging protocol declarations, and a provider adapter. Preserve the existing single-instance focus handler when adding argument processing.

## Dependencies and configuration

Choose the identity provider at implementation time. Public desktop clients use PKCE, never an embedded client secret. Store any server-side secrets outside the desktop binary. On Linux, check encryption availability **and backend**; reject plaintext-like `basic_text` instead of silently storing tokens insecurely.

## Acceptance tests

- [ ] Malformed/wrong scheme, host, path, missing/wrong state, replay and expired callback are rejected.
- [ ] Cold start, existing instance and macOS callbacks complete exactly once.
- [ ] Browser cancellation and provider failure leave a recoverable signed-out state.
- [ ] Missing keychain/safeStorage backend fails closed.
- [ ] Logout removes ciphertext and revokes server sessions where supported.
- [ ] No token appears in renderer events, logs, URLs after processing, or test artifacts.

## Integration

This plan is not an authentication system. Implement the provider and native tests before merging `origin/feat/auth-security`.


## Implementation and evidence

This branch now contains current main, the shared validated plugin framework, and only the auth-security implementation with its required dependencies. It is not an all-features snapshot.

See [plan, implementation, tests and remaining acceptance](documentation/features/auth-security.md). The integrated suite passed combined main/renderer typechecks, 91 unit tests (including real Node SQLite), and a full production build. Browser and native/package CI outcomes are recorded separately in the integration PR; do not infer a target-OS/provider/signature result from unit tests.

The original acceptance checklist above is retained as release validation, not falsely checked off. No main merge, tag or release was made.
