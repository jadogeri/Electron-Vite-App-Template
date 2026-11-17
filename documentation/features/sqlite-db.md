# SQLite notes

## Status

**Implemented; local database tests completed. Packaged native verification pending.**
This replaces the original specification-only branch with a main-process notes
database and an editable renderer view. It does not claim a complete platform
acceptance matrix.

## Runtime and integration

- Add production `better-sqlite3` (validated here with 12.11.1) and `drizzle-orm`
  (validated version recorded in the integration report); add development
  `@types/better-sqlite3` and appropriate Electron native rebuild tooling.
- Register `sqlite-db` in the shared feature host and renderer loader. The plugin
  returns allowlisted `list`, `create`, `update`, and `remove` procedures.
- The database opens lazily at `app.getPath('userData')/notes.sqlite3`; the
  renderer cannot supply paths or SQL. Drizzle performs actual parameterized
  CRUD; synchronous main-process transactions serialize the bounded writes.
- Versioned, fixed migrations are embedded in `database.ts`, so no loose
  migration asset can be omitted from a package. Each startup applies outstanding
  migrations and version records in one SQLite transaction. Unknown versions are
  rejected rather than downgraded.
- WAL, foreign keys and a 3-second busy timeout are enabled. Limit: 10,000 notes;
  160-character title, 16,384-character body, at most 100 rows per list call.
  The starter UI displays the first 100; callers can page with bounded offsets.
- `beforeQuit` and `shutdown` checkpoint/close idempotently. Call the shared
  shutdown hook before updater restart too.
- Rebuild the native dependency for **each Electron version/platform/architecture**
  (for example with `electron-builder install-app-deps` / `@electron/rebuild`).
  Configure `asarUnpack: ["**/node_modules/better-sqlite3/**"]`. Node-runtime
  native tests are **not** evidence of Electron ABI compatibility.

## Automated evidence

`tests/sqlite-db.test.ts` uses the actual native SQLite driver, not a fake:

- Fresh disk migration, repeated startup, real Drizzle CRUD and SQL-like text.
- Invalid lengths, unknown fields, invalid IDs and renderer path/SQL rejection.
- A deliberately failing migration rolls back both DDL and version insertion,
  preserving existing data.
- Repeated operations produce unique IDs; shutdown closes the driver and rejects
  later use.

Run `npm test` after installing native dependencies for the **Node test runtime**.
Rebuild for Electron again before app launch if tests changed the addon ABI.

## Recovery and remaining checks

Never delete an unreadable database as automatic recovery. Quit the app first,
then copy the entire user-data folder, including `notes.sqlite3`, its WAL and SHM
siblings if present. Attempt migration repairs only on a copy. Restore from a
known-good backup if available. Closed/checkpointed files can be copied as a
consistent backup; copying only a live database while ignoring its WAL is unsafe.
This starter is not an encryption or scheduled backup solution.

Pending: packaged Windows/macOS/Linux addon loading for supported architectures,
updater-restart cleanup in a packaged app, forced-power-loss recovery and
multi-instance lock-contention testing. No native package or release was published.

## Native integration runner

After rebuilding `better-sqlite3` for the target Electron ABI and building the
worker output, run from `app/`:

```
electron scripts/native-smoke.cjs
```

Linux CI should use `xvfb-run -a electron scripts/native-smoke.cjs`. The shared
runner resolves the actual addon with `createRequire` anchored to the app's
package, then performs real temporary disk CRUD, transaction rollback, close,
reopen and delete. It also checks the real utility process. It exits zero only
when all checks pass; failures/deadlines exit nonzero without raw driver errors.
It does not touch the user's application database.

For an actual packaged-app check, the integration must include
`scripts/native-smoke.cjs` in packaged files and invoke
`runNativeSmokeAndExit({ packaged: true })` from the packaged main entry under
an explicit CI-only command-line switch, before creating normal windows.
Packaged mode resolves addon dependencies and `out/main/worker-process.cjs`
relative to `app.getAppPath()`, exercising native ASAR-unpack resolution.
The runner does not itself edit the main entry or packaging configuration.
Native execution remains pending until that CI/target-OS run actually succeeds.
