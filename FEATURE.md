# Command palette, shortcuts and context menus

Branch: `feat/command-palette`  
Roadmap: **19. Keyboard shortcuts · 20. Command palette · 21. Context menu helper**  
Status: **implemented for review; target-OS and external-account acceptance is separate.**

## Implemented scope from the original plan

- Searchable Cmd/Ctrl+K command palette for navigation, appearance, and update checks.
- Cmd/Ctrl+, opens Settings. Keep these app-local unless the user explicitly enables OS-global shortcuts.
- Central command registry shared by menu actions, keyboard dispatch, and palette.
- Optional `globalShortcut` registrations only for intentional cross-app commands; detect registration failures and unregister on quit.
- Reusable native context menus with an allowlisted set of edit/custom commands.

## Implementation map

Add renderer command registry, palette dialog, and focus-management tests; extend `app/src/main/menu.ts` and a bounded context-menu IPC method. Integrate existing Home/Dashboard/Settings routes and updater check.

## Dependencies and security

A lightweight accessible dialog is sufficient; no API keys. Never let renderer strings become arbitrary native menu callbacks or executable commands. Respect input fields, composition events, and disabled actions.

## Acceptance tests

- [ ] Cmd/Ctrl+K toggles the dialog; typing filters commands; Enter runs; Escape closes.
- [ ] Focus is trapped while open and restored on close; keyboard-only use works.
- [ ] Shortcuts are not registered twice after React StrictMode or window recreation.
- [ ] Unknown command/context-menu identifiers are rejected by main.
- [ ] Edit actions use Electron roles and honor editable/non-editable targets.
- [ ] OS-global registration conflicts fail gracefully.

## Integration

Implement and validate before merging `origin/feat/command-palette`. Keep the core menu's existing shortcuts intact and document any changed bindings.


## Implementation and evidence

This branch now contains current main, the shared validated plugin framework, and only the command-palette implementation with its required dependencies. It is not an all-features snapshot.

See [plan, implementation, tests and remaining acceptance](documentation/features/command-palette.md). The integrated suite passed combined main/renderer typechecks, 91 unit tests (including real Node SQLite), and a full production build. Browser and native/package CI outcomes are recorded separately in the integration PR; do not infer a target-OS/provider/signature result from unit tests.

The original acceptance checklist above is retained as release validation, not falsely checked off. No main merge, tag or release was made.
