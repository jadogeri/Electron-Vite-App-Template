# Command palette, shortcuts and native context menus

**Status: Completed — implementation and automated checks.** Release/native/account acceptance remains pending as detailed below. The original specification is preserved in [the historical plan](command-palette-original-plan.md).

Branch-source checks: both TypeScript projects, 24 unit tests, full production build, and 3 installed-feature browser scenarios passed. Integrated suite: 91 unit tests and 37 production-browser scenarios, no skips. Windows/macOS/Linux unsigned native and packaged SQLite/utility-process smoke passed in [CI](https://github.com/jadogeri/Electron-Vite-App-Template/actions/runs/44120989994). This does not certify signing, real providers, keychains or every interactive OS behavior.

Status: **Implemented; automated checks passed; browser/native acceptance pending.**
Original acceptance criteria remain in `FEATURE.md` on `feat/command-palette`.

## Implemented

- Central typed registry for Home, Dashboard, Settings, System/Light/Dark appearance and update checks. Search, native command menus and dispatch use the same identifiers and labels.
- Ctrl/Cmd+K toggles a searchable modal palette; Ctrl/Cmd+, opens Settings. App-local shortcuts ignore handled events, repeat, IME composition, and unrelated Alt/Shift combinations. No ordinary typing shortcuts are stolen.
- Arrow-key/Enter selection, Escape, first/last Tab wrapping, focus-escape guard, focus restoration, scroll lock, combobox/listbox labels and live status/error messages.
- Renderer listeners clean up under React StrictMode/window recreation. Palette animations are disabled for reduced-motion users.
- Optional, separately persisted cross-app Ctrl/Cmd+Alt+Space shortcut is disabled by default. Failed/conflicting registrations display recovery guidance; disable/re-enable retries. Only owned registrations are removed on quit.
- Main allowlists command IDs and context-menu selections. IPC cannot supply executable code, menu roles, arbitrary callbacks, URLs, paths or accelerators.
- Native editing context menu comes from Electron's trusted `context-menu` parameters: edit roles use actual editable state and edit flags. Non-editable targets receive Copy only when text is selected, not arbitrary Cut/Paste.
- Main update checks invoke the existing updater. Appearance commands persist through existing settings; targeted events update the invoking renderer. Navigation/command events go only to their owning main window.

## Host integration

No new runtime or test dependencies. Render this plugin globally **inside** the router, once per window.

Methods: `state()`, `globalShortcut({enabled})`, `run(commandId)`, `contextMenu({commands: commandId[]})`.
Events: `open` with `{}`, `execute` with `{id}`, `error` with `{}`.

Native menus can import `desktopCommandMenu(mainWindow)` from the main plugin; it builds safe menu entries using the initialized registry. Preserve existing File/Edit/View shortcuts. Generic `commands`/`commandMenu(dispatch)` are also exported for reuse.

The renderer emits `desktop:theme-changed` with the existing Settings DTO after re-reading persisted appearance. The host Workspace should listen and update its own settings state so its existing appearance selector stays synchronized. DOM theme application is already performed by this plugin. Call `beforeQuit`/`shutdown` for global shortcut cleanup.

## Evidence and remaining acceptance

Completed automated checks: registry uniqueness/search/multiword filtering; native menu IDs; unknown/context role injection/unbounded selection rejection; opt-in global registration, conflict retry and owned-only cleanup; local shortcut composition/modifier/repeat handling; stateful focus transitions (forward/reverse/escaped/empty dialog). Main/renderer typecheck and full unit suite passed.

Pending browser interaction tests: actual React StrictMode listener counts; mounted palette open/type/filter/Enter/Escape; browser focus restoration/trapping; route and theme selector integration; screen-reader behavior. Current focus tests exercise DOM-shaped stateful fakes, not a browser.

Pending native Windows/macOS/Linux smoke checks: actual global shortcut conflict/OS permission behavior, cross-app window restoration, native editing menu flags, core menu integration, updater command behavior in a packaged app, and keyboard/screen-reader interaction on each OS. No claim of native completion is made from source or fake-only tests.
