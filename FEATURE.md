# Offline SQLite database starter

Branch: `feat/sqlite-db`  
Roadmap: **22. better-sqlite3 + Drizzle ORM local database**  
Status: **implemented for review; target-OS and external-account acceptance is separate.**

## Implemented scope from the original plan

- Main-process better-sqlite3 connection in `app.getPath('userData')`, never the installation directory.
- Drizzle schema/migration example for a small notes table, including stable IDs and timestamps.
- Typed, bounded CRUD methods through preload; no raw SQL IPC surface.
- Versioned migrations, foreign keys, transactions, and WAL where appropriate.
- Connection cleanup before shutdown or updater restart; backup/recovery guidance.

## Implementation map

Add `app/src/main/database/`, migration assets, shared note DTO schemas, and a renderer example view. Package migration files and unpack the native addon from ASAR. Run Electron native rebuild after installation and on each release platform/architecture.

## Dependencies

`better-sqlite3`, `drizzle-orm`; development `drizzle-kit` and appropriate types/rebuild tooling. Pin compatible versions and update the lockfile. Native C++ build tools are required when prebuilds are unavailable. No remote database key.

## Acceptance tests

- [ ] Fresh database migration, repeat startup, CRUD, rollback, and invalid input tests pass.
- [ ] Queries are parameterized; path and SQL strings cannot be supplied by renderer.
- [ ] Packaged app loads the native addon on Windows/macOS/Linux for supported architectures.
- [ ] Migration failures preserve data and show an actionable error.
- [ ] Concurrent operations and shutdown do not corrupt the database.
- [ ] Native dependencies remain absent from core/main until explicitly merged.

## Integration

Only after implementation: merge `origin/feat/sqlite-db`, reinstall, rebuild native modules, and test **packaged** binaries. Browser-only tests are insufficient.


## Implementation and evidence

This branch now contains current main, the shared validated plugin framework, and only the sqlite-db implementation with its required dependencies. It is not an all-features snapshot.

See [plan, implementation, tests and remaining acceptance](documentation/features/sqlite-db.md). The integrated suite passed combined main/renderer typechecks, 91 unit tests (including real Node SQLite), and a full production build. Browser and native/package CI outcomes are recorded separately in the integration PR; do not infer a target-OS/provider/signature result from unit tests.

The original acceptance checklist above is retained as release validation, not falsely checked off. No main merge, tag or release was made.
