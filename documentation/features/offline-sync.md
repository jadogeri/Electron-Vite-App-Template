# Durable offline sync

**Status: Completed — implementation and automated checks.** Release/native/account acceptance remains pending as detailed below. The original specification is preserved in [the historical plan](offline-sync-original-plan.md).

Branch-source checks: both TypeScript projects, 25 unit tests, full production build, and 1 installed-feature browser scenarios passed. Integrated suite: 91 unit tests and 37 production-browser scenarios, no skips. Windows/macOS/Linux unsigned native and packaged SQLite/utility-process smoke passed in [CI](https://github.com/jadogeri/Electron-Vite-App-Template/actions/runs/44120989994). This does not certify signing, real providers, keychains or every interactive OS behavior.

## Status

**Implemented and deterministic queue tests completed. Live-backend integration
pending by design.** No production backend was invented, contacted or configured.

The tools view shows verified backend state, pending/retrying/failed operations,
and explicit conflict retry/discard controls. Browser online/offline events are
only hints: a successful health request is required before delivery.

## Backend contract and configuration

Set **main-process** `APP_SYNC_BASE_URL` to an explicitly chosen HTTPS API prefix.
No renderer-provided URL or credential is accepted. An absent value reports
`not-configured`, retains the local queue, and makes **zero network requests**.
Bad configuration/corrupt storage reports an actionable unavailable state without
crashing the application.

- `GET <prefix>/health` must return **204**. A captive portal or generic 200 page
  is not evidence of backend availability.
- `POST <prefix>/operations` receives JSON `{ id, payload: { title, text } }` and
  `Idempotency-Key: <stable operation UUID>`.
- The backend must durably deduplicate the idempotency key **before** applying
  changes. Client retries cannot promise exactly-once delivery on their own.
- 2xx acknowledges delivery; 409 preserves a visible conflict. Other 4xx are
  permanent except 408/429; transport errors and 5xx retry up to five attempts.
  Redirects are rejected; credentials/cookies are omitted; response bodies are
  cancelled without parsing/logging them.
- The starter deliberately has **no auth adapter**. A target product must add a
  trusted main-side auth adapter if needed; never queue tokens or credentials.
  No localhost HTTP exception is enabled.

## Durability and limits

The application-owned `sync-queue.json` lives in `userData`. Writes validate the
entire bounded JSON document, use a private temporary file, fsync, and atomically
rename it. POSIX directory fsync is used; Windows rename/flush semantics must
still be exercised on real Windows. Failed or unreadable storage is never
silently replaced with an empty queue.

Maximum 200 operations and 5 MB file; title 160 and text 4,096 characters.
The operation schema rejects extra fields. This is **unencrypted domain data**:
do not use credentials or sensitive data. Retention is seven days for automatic
delivery; expired operations remain visibly failed until explicit retry/discard,
not silently deleted. Product owners must choose their own privacy/deletion
policy before shipping sensitive data.

Attempts are persisted before sending. Ambiguous failure/restart keeps the same
operation UUID and idempotency key. Drains are serialized, with bounded
exponential delay (1/2/4/8/16 seconds plus up to 250 ms jitter), a 5-second request
timeout and a 5-second scheduler tick. Offline hints and shutdown abort requests.
Retry after a visible conflict is explicit, preserves the key, and does not
silently overwrite server data. Resolve the backend conflict first; a product
requiring editable merged revisions needs a domain-specific conflict editor.

Register the `offline-sync` main/renderer plugin. Methods:
`status`, `enqueue`, `onlineHint`, `drain`, `resolve`; event: `status`.
No additional dependency beyond the host's Zod is required.

## Verified and pending

`tests/offline-sync.test.ts` tests the actual queue with deterministic fake HTTP
and clock/timers, plus real atomic JSON storage: restart/delivery, concurrent
drain exclusion, health failures, stable retry keys/deadlines, 409 conflicts,
permanent errors, five-attempt exhaustion, retention, timeout/abort/shutdown,
queue bounds and storage-write failure.

Pending: live chosen-backend auth/idempotency/conflict contract; end-to-end browser
offline/online UI tests; target-OS crash/power-loss/fsync behavior. Unit checks
are not evidence of those integrations.
