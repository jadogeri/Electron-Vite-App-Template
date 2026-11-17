import { BrowserWindow, globalShortcut, Menu } from 'electron'
import Store from 'electron-store'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { featureChannels } from '../../../shared/features'
import { setTheme } from '../../settings'
import { checkForUpdates } from '../../updater'
import { commandIds, commandMenu, optionalGlobalShortcut, type CommandId } from './commands'
import { commandSchema, contextMenuSchema } from './validation'

export { commands, commandMenu } from './commands'
let nativeDispatch: ((id: CommandId, window: BrowserWindow) => Promise<boolean>) | null = null
/** Core menu integration: no renderer-provided callback, path, role or accelerator. */
export function desktopCommandMenu(window: BrowserWindow): Electron.MenuItemConstructorOptions[] {
  return commandMenu(id => { void nativeDispatch?.(id, window).catch(() => {}) })
}
export default function commandPalette(context: FeatureContext): MainFeature {
  const store = new Store({ name: 'feature-command-palette', clearInvalidConfig: true })
  const removers = new Map<BrowserWindow, () => void>()
  const send = (window: BrowserWindow, event: string, payload: unknown) => {
    if (!window.isDestroyed()) window.webContents.send(featureChannels.event, 'command-palette', event, payload)
  }
  const run = async (id: CommandId, window: BrowserWindow) => {
    if (window.isDestroyed()) throw new Error('Window unavailable')
    if (id === 'check-updates') await checkForUpdates()
    if (id === 'theme-system') setTheme('system')
    if (id === 'theme-light') setTheme('light')
    if (id === 'theme-dark') setTheme('dark')
    send(window, 'execute', { id })
    return true
  }
  nativeDispatch = run
  const showPalette = () => {
    const windows = context.windows()
    const window = windows.find(candidate => candidate.isFocused()) || windows[0]
    if (!window || window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show(); window.focus()
    send(window, 'open', {})
  }
  const shortcut = optionalGlobalShortcut(globalShortcut, showPalette)
  let shortcutState = shortcut.setEnabled(store.get('globalShortcut', false) === true)
  const owner = (event: Electron.IpcMainInvokeEvent) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || window.isDestroyed()) throw new Error('Window unavailable')
    return window
  }
  return {
    methods: {
      state: procedure(z.void(), () => shortcutState),
      globalShortcut: procedure(z.object({ enabled: z.boolean() }).strict(), ({ enabled }) => {
        store.set('globalShortcut', enabled)
        shortcutState = shortcut.setEnabled(enabled)
        return shortcutState
      }),
      run: procedure(commandSchema, (id, event) => run(id, owner(event))),
      contextMenu: procedure(contextMenuSchema, ({ commands: selected }, event) => {
        const window = owner(event)
        const allowed = new Set(selected)
        Menu.buildFromTemplate(commandMenu(id => {
          void run(id, window).catch(() => send(window, 'error', {}))
        }).filter((_, index) => allowed.has(commandIds[index]))).popup({ window })
        return true
      })
    },
    attachWindow(window) {
      if (removers.has(window)) return
      const onContext = (_event: Electron.Event, params: Electron.ContextMenuParams) => {
        const editing: Electron.MenuItemConstructorOptions[] = params.isEditable
          ? [{ role: 'undo', enabled: params.editFlags.canUndo }, { role: 'redo', enabled: params.editFlags.canRedo },
            { type: 'separator' }, { role: 'cut', enabled: params.editFlags.canCut },
            { role: 'copy', enabled: params.editFlags.canCopy }, { role: 'paste', enabled: params.editFlags.canPaste },
            { role: 'selectAll', enabled: params.editFlags.canSelectAll }]
          : params.selectionText ? [{ role: 'copy' }, { role: 'selectAll' }] : []
        const custom = commandMenu(id => {
          void run(id, window).catch(() => send(window, 'error', {}))
        })
        Menu.buildFromTemplate([...editing, ...(editing.length ? [{ type: 'separator' as const }] : []), ...custom])
          .popup({ window })
      }
      const remove = () => {
        window.webContents.removeListener('context-menu', onContext)
        window.removeListener('closed', remove)
        removers.delete(window)
      }
      window.webContents.on('context-menu', onContext)
      window.once('closed', remove)
      removers.set(window, remove)
    },
    beforeQuit() { shortcut.shutdown() },
    shutdown() {
      shortcut.shutdown()
      if (nativeDispatch === run) nativeDispatch = null
      for (const remove of [...removers.values()]) remove()
    }
  }
}
