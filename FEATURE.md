# Internationalization starter

Branch: `feat/i18n`  
Roadmap: **27. OS locale detection and i18next translations**  
Status: **implemented for review; target-OS and external-account acceptance is separate.**

## Implemented scope from the original plan

- Detect `app.getLocale()` after Electron readiness, normalize language tags, and map to bundled locales.
- i18next/react-i18next setup with English fallback and at least one additional complete example locale.
- Typed locale preference persisted through the existing settings store.
- Translate navigation, loading, updater, error fallback and notification strings; localize native menus.
- Locale-aware number/date formatting and a documented RTL strategy.

## Implementation map

Add local translation resources and initialization, shared locale allowlist, main locale method, settings language selector, and translated menu construction. Do not replace the existing theme preference or settings validation.

## Dependencies and security

`i18next` and `react-i18next`, with a synchronized lockfile. Bundle translations locally; no remote script or runtime translation fetch requirement. Render translation strings as text, not untrusted HTML.

## Acceptance tests

- [ ] Supported OS locale is chosen on first launch and explicit preference survives restart.
- [ ] Unsupported locale/missing key falls back to English without blank UI.
- [ ] All core routes, updater statuses, loading and errors have translations.
- [ ] Interpolated versions/percentages are escaped and correctly formatted.
- [ ] Layout tolerates long translations; keyboard/accessibility labels remain meaningful.
- [ ] Locale changes update renderer and native menu without duplicate listeners.

## Integration

Implement translations and tests before merging `origin/feat/i18n`. This specification does not yet install i18next or translate the core.


## Implementation and evidence

This branch now contains current main, the shared validated plugin framework, and only the i18n implementation with its required dependencies. It is not an all-features snapshot.

See [plan, implementation, tests and remaining acceptance](documentation/features/i18n.md). The integrated suite passed combined main/renderer typechecks, 91 unit tests (including real Node SQLite), and a full production build. Browser and native/package CI outcomes are recorded separately in the integration PR; do not infer a target-OS/provider/signature result from unit tests.

The original acceptance checklist above is retained as release validation, not falsely checked off. No main merge, tag or release was made.
