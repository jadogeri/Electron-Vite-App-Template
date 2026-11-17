# Bounded Electron utility-process work

## Status

**Implemented and algorithm/lifecycle tests completed. Native Electron and
packaged OS acceptance checks pending.**

The tools view starts a deterministic prime-count task, shows correlated
progress and results, and offers cancellation. Runtime uses
`electron.utilityProcess.fork`, not a renderer loop or an in-main fake worker.

## Required build integration

The main plugin expects **`out/main/worker-process.cjs`** under `app.getAppPath()`.
Bundle `src/main/features/worker-process/worker.ts` as that CJS entry. Main can
remain ESM. For example, use a separate Vite/Rollup build step with
`build.lib.entry` pointing to the worker, `formats: ['cjs']`,
`fileName: () => 'worker-process.cjs'`, and `outDir: 'out/main'`,
**`emptyOutDir: false`**. Build the worker after the normal main output so it is
not erased. Bundle its Zod/protocol code; do not accidentally bundle Electron.
The source `worker.ts` is the owned worker build entry.

The app's existing `out/**/*` packaged file inclusion covers this file. Verify
the final path inside the package; source resolution or a bridge mock is not a
packaged smoke test. Register the `worker-process` main/renderer plugin.
Methods: `start`, `cancel`, `status`; event: `job`. No new runtime package beyond
the host's Zod and built-in Electron is required.

## Bounds and lifecycle

- Only a validated integer limit from 1,000 through 10,000,000 is accepted; no
  arbitrary code, paths or credentials are sent.
- At most two active utility processes. Every job has a UUID, 15-second
  deadline, and `--max-old-space-size=64`. The sieve's buffer is at most about
  10 MB; the JS heap limit is **not** a whole-process or OS sandbox memory cap.
- The algorithm yields between bounded chunks and reports numeric progress.
  Main ignores malformed, unknown-ID and backwards progress messages.
- Completion, cancellation, deadline, send failure, crash and shutdown settle
  exactly once and release timers/listeners. Cancellation kills the dedicated
  process rather than waiting for cooperation from a CPU loop.
- There is no automatic crash restart (zero retries); the user can explicitly
  start a new task. Completed history is bounded at 50 jobs.

## Evidence and pending native verification

`tests/worker-process.test.ts` runs the actual sieve against known prime counts
(168 up to 1,000; 9,592 up to 100,000), validates bounds and progress/yields, and
exercises the actual manager state machine through a process transport harness.
It covers stale messages, concurrency overflow, cancellation, crash, deadline,
send failure, listener/timer cleanup and bounded history. The harness is **not**
evidence that a native Electron process launched.

After building the worker, run:

```
electron src/main/features/worker-process/native-check.cjs
```

The optional real Electron harness checks a 1,000,000 limit returns 78,498 and a
second real process can be cancelled. Linux CI requires a display/Xvfb and its
system libraries. Do not disable sandbox in shipped apps.

Pending: execute that harness in a supported Electron environment; verify
packaged Windows/macOS/Linux worker spawn/termination, UI/main responsiveness,
timeouts/crashes in real processes, no orphans after repeated native runs, and
packaged path resolution. No claim of completed native acceptance is made.

## Combined native integration smoke runner

The preferred CI runner is now `electron scripts/native-smoke.cjs` from `app/`
(Linux: `xvfb-run -a electron scripts/native-smoke.cjs`). It checks both the real
native SQLite addon and the built worker. The worker must return exactly 78,498
primes up to 1,000,000; a second worker must report actual progress before
cancellation kills it and its exit is observed. Each worker has a 15-second
deadline; the runner has a 40-second overall deadline and exits 0 only on
success, otherwise nonzero. It cleans up its temporary database.

Development mode resolves the app root from the script location, so Electron's
script-mode `app.getAppPath()` cannot accidentally point it at `scripts/out`.
The exported `runNativeSmokeAndExit({ packaged: true })` instead uses
`app.getAppPath()` for the real packaged app root. Integration owns including
this script in the package and invoking it from an explicit CI-only main-entry
switch. Merely passing the packaged flag to a development Electron script is
not evidence that a packaged app was tested.
