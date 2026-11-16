# Security policy

## Reporting vulnerabilities

Do not post exploit details or secrets in public issues. Contact [@jadogeri](https://github.com/jadogeri) through a private channel listed on the maintainer's profile, or use GitHub private vulnerability reporting if enabled. If neither is available, open an issue requesting a private contact **without vulnerability details**. No response SLA is promised.

## Security boundaries

- Renderer: no Node integration, sandbox enabled, context isolation enabled.
- Preload: explicit methods only, with a shared TypeScript IPC contract.
- Main: IPC restricted to the owned top-level renderer frame; Zod validates theme/file-save arguments.
- External links: only HTTP(S), no embedded URL credentials; all popup windows denied.
- CSP: no remote scripts, objects, frames, or form targets. Vite HMR exceptions apply only to development.
- Permissions: denied by default; new capabilities require an intentional policy change.
- Settings: validated on read and write. **Not encrypted** and not suitable for tokens.
- Logs: rotating files in Electron's logs directory. Application crash logging records event codes, not exception payloads; the third-party updater's diagnostic logs may include release URLs.
- Updates: disabled in unpackaged development. Install only after a downloaded update and an explicit user action.

## Distribution

Unsigned default artifacts are not a substitute for code signing or notarization. Review and test releases before publishing. Secrets belong in local environment variables or GitHub Actions secrets, never in `VITE_*`, source, screenshots, logs, or issue reports.

## Dependency checks

Run `cd app && npm audit` and review findings. Lockfile presence is not a security guarantee. The template does not provide a compliance certification.
