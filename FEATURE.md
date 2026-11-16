# Background utility-process starter

Branch: `feat/worker-process`  
Roadmap: **26. CPU-heavy tasks off the UI/main thread**  
Status: **planned; this branch adds this specification only, not runtime functionality.**

## Features to add

- Bundled Electron `utilityProcess` entry for a deterministic CPU-work example.
- Shared request/progress/result/error envelopes with unique job IDs.
- Main-process job manager with bounded concurrency, timeouts, cancellation, and crash cleanup.
- Renderer progress/cancel UI through narrow validated IPC.
- Restart workers only according to a bounded retry policy; never run arbitrary renderer-supplied code.

## Implementation map

Add `app/src/main/workers/`, a worker build entry in electron-vite, shared message schemas, and renderer task hook/example. Ensure the packaged worker path resolves inside the built output.

## Dependencies and security

Electron built-in UtilityProcess API; no API keys. Define payload/output byte limits and CPU/memory budgets. Do not pass credentials or unvalidated filesystem paths to a worker; a utility process is not a security boundary for arbitrary code.

## Acceptance tests

- [ ] UI and main loop remain responsive during heavy work.
- [ ] Progress is correlated to the correct job; stale/unknown messages are ignored.
- [ ] Cancel, timeout, worker crash and app shutdown settle promises and release resources.
- [ ] Oversized/malformed jobs and concurrency overflow are rejected.
- [ ] Packaged Windows/macOS/Linux apps can start and terminate the bundled worker.
- [ ] No orphan processes or duplicate event listeners after repeated tasks.

## Integration

Implement native process tests before merging `origin/feat/worker-process`. Renderer bridge mocks alone cannot validate worker lifecycle.
