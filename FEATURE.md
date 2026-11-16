# Internationalization starter

Branch: `feat/i18n`  
Roadmap: **27. OS locale detection and i18next translations**  
Status: **planned; this branch adds this specification only, not runtime functionality.**

## Features to add

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
