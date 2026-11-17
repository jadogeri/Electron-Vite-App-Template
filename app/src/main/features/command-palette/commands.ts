export const commandIds = ['home', 'dashboard', 'settings', 'theme-system', 'theme-light', 'theme-dark', 'check-updates'] as const
export type CommandId = typeof commandIds[number]
export const commands: ReadonlyArray<{ id: CommandId; label: string; keywords: string }> = [
  { id: 'home', label: 'Go to Home', keywords: 'navigate start' },
  { id: 'dashboard', label: 'Go to Dashboard', keywords: 'navigate health' },
  { id: 'settings', label: 'Open Settings', keywords: 'preferences configuration' },
  { id: 'theme-system', label: 'Appearance: System', keywords: 'theme automatic' },
  { id: 'theme-light', label: 'Appearance: Light', keywords: 'theme bright' },
  { id: 'theme-dark', label: 'Appearance: Dark', keywords: 'theme night' },
  { id: 'check-updates', label: 'Check for Updates', keywords: 'download version upgrade' }
]
export function filterCommands(query: string) {
  const words = query.trim().toLowerCase().slice(0, 100).split(/\s+/)
  return commands.filter(command => words.every(word => `${command.label} ${command.keywords}`.toLowerCase().includes(word)))
}

/** Native menus and renderer palette share identifiers, labels and dispatch. */
export function commandMenu(dispatch: (id: CommandId) => void) {
  return commands.map(({ id, label }) => ({ label, click: () => dispatch(id) }))
}

export interface ShortcutPort {
  register(accelerator: string, callback: () => void): boolean
  unregister(accelerator: string): void
}
export const globalAccelerator = 'CommandOrControl+Alt+Space'
export function optionalGlobalShortcut(port: ShortcutPort, callback: () => void) {
  let registered = false
  return {
    setEnabled(enabled: boolean) {
      if (!enabled) {
        if (registered) port.unregister(globalAccelerator)
        registered = false
        return { enabled: false, registered: false, conflict: false }
      }
      if (!registered) {
        try { registered = port.register(globalAccelerator, callback) }
        catch { registered = false }
      }
      return { enabled: true, registered, conflict: !registered }
    },
    shutdown() {
      if (registered) port.unregister(globalAccelerator)
      registered = false
    }
  }
}
