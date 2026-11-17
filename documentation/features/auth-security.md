# Authentication and encrypted credentials

## Status

Runtime implementation is present, not a documentation-only feature. Automated checks
exercise the actual PKCE, callback state machine, HTTP adapter, signed OIDC tokens,
and encrypted-file persistence logic using synthetic credentials and a deterministic
encryption adapter. Native Electron keychains, protocol delivery, and live-provider
sign-in remain **pending**; this feature is not represented as production-verified.

## Included

- Configurable standards-based OIDC public-client adapter: HTTPS discovery, system-browser
  authorization code flow, S256 PKCE, state, nonce, signed ID-token verification with
  `jose`, exact issuer/audience/authorized-party checks, required claims and expiry.
- One in-memory attempt, five-minute expiration, single-use callback consumption before
  network awaits, replay/wrong-state rejection, cancellation generation guards, and
  serialized disk writes so logout wins against an in-flight exchange.
- Strict callback `electron-vite-template://auth/callback`, bounded parsing, no fragments,
  credentials, duplicate parameters, implicit-flow tokens, wrong host/path/port, or
  unexpected parameters. Optional authorization-response `iss` must match the provider.
- Main-only Electron `safeStorage` encryption, dedicated restricted directory, exclusive
  mode-0600 temporary ciphertext files, fsync then atomic rename, no plaintext persistence.
  Linux rejects `basic_text`, unknown/missing backend, or unavailable encryption.
- Safe renderer status/sign-in/cancel/sign-out controls, live announcements, keyboard
  buttons, and listener cleanup. No token or credential-read bridge method exists.
- Local deletion on logout plus RFC 7009 revocation of refresh/access tokens when the
  provider advertises a revocation endpoint. No client secret is embedded or accepted.
- Access/session expiry signs out and deletes the saved ciphertext. No silent refresh
  is implemented; users sign in again after expiration.

## Main-process configuration

Disabled by default; do not select or configure an external identity provider implicitly.
An administrator explicitly sets:

| Name | Meaning |
| --- | --- |
| `ELECTRON_OIDC_ISSUER` | Exact HTTPS issuer from the chosen provider, no query/fragment/userinfo |
| `ELECTRON_OIDC_CLIENT_ID` | Registered public desktop client identifier, not a secret |
| `ELECTRON_OIDC_SCOPES` | Optional space-separated scopes, defaults to `openid`; must contain `openid` |

Register the exact callback URI above with the provider, enable authorization-code
public-client S256 PKCE, and register it as a desktop/native application.
No password, private API key, or client secret belongs in the desktop executable.
Do not use renderer/VITE-prefixed variables for this configuration.

The provider must expose OIDC discovery and JWKS, return a signed ID token and a
numeric positive `expires_in`, and support one of RS256, PS256, ES256, or EdDSA.
HTTPS endpoints may not redirect. HTTP requests time out after 10 seconds, omit cookies,
cap JSON bodies at 128 KiB, and do not disclose raw errors/response bodies.

## Required shared integration

Add runtime dependency `jose` `^6.1.0` (existing `zod` is reused).
The feature host discovers these plugin entry points:

- Main: `app/src/main/features/auth-security/index.ts`.
- Renderer: `app/src/renderer/src/features/auth-security/index.tsx`, placement `settings`.
- IPC allowlist: `status`, `signIn`, `cancel`, `signOut`, each accepting no input.
- Event: `status`; payload includes only configured/state, optional fixed error code,
  optional expiration timestamp.

In electron-builder configuration, declare:

```json
{
  "protocols": [{
    "name": "Electron Vite authentication",
    "schemes": ["electron-vite-template"]
  }]
}
```

The shared host must register the scheme through `app.setAsDefaultProtocolClient`
(development needs Electron executable/script arguments), retain the single-instance
lock and focus behavior, capture macOS `open-url` **before ready**, and collect Windows/
Linux launch and second-instance arguments. Queue at most a bounded number of bounded
callback strings until plugins initialize; route them to `onProtocol`, then discard
them without logging URLs. Never forward raw callbacks to renderer.

The plugin factory initializes only after Electron is ready (safeStorage requirement).
Do not weaken window isolation or expose credential APIs in preload. On cold start,
there is no pending in-memory browser flow from a previous process: orphan callbacks
are rejected. Callback queuing handles startup delivery, not insecure state restoration.

## Verification and remaining acceptance checks

Run from `app`: `npx tsx --test tests/auth-security.test.ts` and `npm run typecheck`.
Tests use synthetic values only; no live credentials or snapshots of real tokens.

Automated checks cover:

- RFC 7636 challenge vector; malformed/wrong scheme/host/path/port, missing/duplicate/wrong
  state, forbidden token parameters, expired callbacks, concurrent/replayed callbacks.
- Cancellation/late exchange and logout/late write races; missing storage/backend;
  provider/browser/storage failures; no credential data in renderer status events.
- OIDC real cryptographic ID-token signature verification, wrong issuer/audience/nonce/
  authorized party, unsigned/expired/wrong-key tokens, discovery rejection, safe HTTP
  errors, response size limits, and public-client request parameters.
- Ciphertext-only persistence semantics, POSIX permissions, atomic replacement,
  corrupt data/symlink rejection, restoration/expiry, logout deletion/revocation.

Still pending before the original feature acceptance criteria are fully satisfied:

1. Packaged Windows/Linux cold-start and second-instance callbacks plus macOS `open-url`,
   exactly-once delivery, default-protocol registration, and focus preservation.
2. Actual safeStorage encrypt/decrypt across app restarts on Windows Credential Manager/
   DPAPI, macOS Keychain, and Linux Secret Service/KWallet, including locked/missing
   keychains and Linux `basic_text`. Unit adapters do **not** prove OS encryption.
3. Provider registration and browser sign-in/cancel/denial/logout/revocation against a
   deliberately chosen real OIDC provider. No live service has been configured.
4. Native keyboard/screen-reader checks of account controls and packaged build checks.
5. Review OS account protections/ACLs: POSIX chmod is tested here; Windows ACL behavior
   depends on Electron's per-user userData directory and requires target-OS validation.

## Limits and threat model

Custom desktop schemes can be claimed by another installed program. PKCE protects the
authorization code, but deployment owners must choose/register a unique application
scheme before distributing a branded product. Change the callback constant, packaging,
host registration, and provider redirect registration together.

Credentials stay in the main process and are only decrypted after the OS backend
reports encryption available. This does not protect against a compromised OS user,
malicious main-process code, debugger/memory access, or replacement of the application.
Encrypted remnants may survive journaled filesystem deletion/backups; unlink is not
a forensic secure erase. Failed local deletion is surfaced as a storage warning and
must be retried; remote revocation does not imply browser/identity-provider SSO logout.
No token-derived identity, profile, or arbitrary provider error is shown to renderer.
