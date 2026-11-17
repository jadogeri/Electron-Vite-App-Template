# Support

Start with [README.md](README.md) and the [testing guide](documentation/TESTING.md).

## Common problems

### `test:ui` says a browser executable is missing

Run `cd app && npx playwright install chromium`. On a Linux CI host install the browser's OS dependencies with `npx playwright install --with-deps chromium`. For an existing browser, set `CHROMIUM_PATH`.

### A browser preview says the desktop bridge is unavailable

That is expected: preload APIs exist only in Electron. Use `npm run dev`. Playwright injects a typed mock in tests; production never falls back to a fake native API.

### Development does not download updates

Intentional. The auto-updater needs a packaged application, a published release, matching update metadata, and supported installers. Checking in development reports up to date without network activity.

### The installed app says updates have not been set up

The GitHub repository has no published releases yet. This is an informational setup state, not an installer failure or a claim that the app is up to date. The app still starts and can be used normally.

To enable real updates, configure the publish repository, build and test installers plus the matching platform update metadata, then publish a reviewed release. Draft releases are not publicly discoverable. A version tag alone is not enough.

Real network, permission, invalid-feed, or missing update-metadata failures still show an error. Do not fix those by suppressing every HTTP 404 or disabling update checks.

Older installers display the generic “Unable to check for updates” warning for an empty feed. After merging the fix, rebuild and reinstall the application to get the new message; an already-installed binary cannot acquire this change without a new installer or a working published update.

### Windows or macOS warns about the installer

The default release build is unsigned. See the `feat/code-signing` plan; trusted signing needs certificates/accounts that are not bundled with this template.

### An optional branch has no implementation

All ten optional branches currently contain implementation plans. Read `FEATURE.md` before integrating; the roadmap distinguishes core code from planned add-ons.

## Reporting issues

Search existing issues, then include OS/architecture, Node version, app version, reproduction steps, expected behavior, and redacted diagnostics. Use the issue templates. Security concerns belong in a private report following [SECURITY.md](SECURITY.md).
