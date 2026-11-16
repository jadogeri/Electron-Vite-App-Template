# Project documentation

Electron + Vite App Template · TypeScript desktop starter

## Guides

- [Feature roadmap and branch status](FEATURE_ROADMAP.md)
- [Testing and validation boundaries](TESTING.md)
- [Architecture](diagrams/architecture-diagram.md)
- [Sequence diagram](diagrams/sequence-diagram.md)
- [Process flow](diagrams/process-flow-diagram.md)
- [Class / contract diagram](diagrams/class-diagram.md)
- [Deployment diagram](diagrams/deployment-diagram.md)
- [Use cases](diagrams/use-case/use-case-description.md)

## Structure

```text
app/
  src/main/       lifecycle, windows, settings, logger, IPC, updater
  src/preload/    context-isolated API exposure
  src/shared/     request/response types, channels, runtime validation
  src/renderer/  React UI, routes, themes, loading/update states
  tests/         Node unit tests and browser UI tests
.github/         issue/PR templates, CI, tagged releases
documentation/  handbook, diagrams, feature roadmap
```

There is no application database or account system in core, so a fabricated restaurant-style ERD would be misleading. Preferences are local JSON via electron-store; optional SQLite and credential storage have separate planning branches.
