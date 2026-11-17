# Connectivity detection and offline sync queue

Branch: `feat/offline-sync`  
Roadmap: **25. Online/offline detection and queued synchronization**  
Status: **implemented for review; target-OS and external-account acceptance is separate.**

## Implemented scope from the original plan

- Renderer connectivity indicator driven by online/offline events and a bounded first-party health check.
- Treat `navigator.onLine` as a hint, not proof the backend is reachable.
- Durable queue with stable operation IDs, payload validation, retry metadata, and backoff/jitter.
- Drain serially on verified reconnection; use idempotency keys and avoid duplicate requests.
- Visible pending/retrying/failed states and explicit conflict resolution hooks.

## Implementation map

Add main sync service/queue adapter, network-status events, renderer hook/status banner, and deterministic fake-clock/network tests. Use atomic JSON storage for the small starter queue; SQLite integration remains optional rather than an undeclared branch dependency.

## Configuration and security

No third-party package required for the basic example. The target app must choose a backend, auth adapter, conflict policy, maximum payload/queue size, and retention period. Never queue credentials; sensitive domain data needs its own storage policy.

## Acceptance tests

- [ ] Offline events update UI; reconnect verifies actual backend availability.
- [ ] Queue survives restart without losing or duplicating operations.
- [ ] Backoff, timeout, abort, permanent errors and maximum retries are covered.
- [ ] Concurrent drains cannot run; shutdown cancels safely.
- [ ] Retry after ambiguous network failure uses the same idempotency key.
- [ ] Conflicts remain visible rather than silently overwriting user changes.

## Integration

Implement the backend contract and acceptance tests before merging `origin/feat/offline-sync`; this branch currently contains no synchronization runtime.


## Implementation and evidence

This branch now contains current main, the shared validated plugin framework, and only the offline-sync implementation with its required dependencies. It is not an all-features snapshot.

See [plan, implementation, tests and remaining acceptance](documentation/features/offline-sync.md). The integrated suite passed combined main/renderer typechecks, 91 unit tests (including real Node SQLite), and a full production build. Browser and native/package CI outcomes are recorded separately in the integration PR; do not infer a target-OS/provider/signature result from unit tests.

The original acceptance checklist above is retained as release validation, not falsely checked off. No main merge, tag or release was made.
