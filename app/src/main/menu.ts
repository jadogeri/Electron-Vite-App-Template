import { app, BrowserWindow, Menu, shell } from 'electron'
import { checkForUpdates } from './updater'
import { channels } from '../shared/channels'
import { translateMain as t } from './localization'
const commands = import.meta.glob<{ desktopCommandMenu(window: BrowserWindow): Electron.MenuItemConstructorOptions[] }>('./features/command-palette/index.ts', { eager: true })

export function registerAppMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin'
  const sendCommand = (value: string) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channels.command, value)
    }
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => sendCommand('new') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => sendCommand('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendCommand('save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendCommand('save-as') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const }
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const }
            ]),
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => sendCommand('find') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const }])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://electronjs.org')
        },
        {
          label: 'Check for Updates…',
          click: () => { void checkForUpdates() }
        },
        ...(!isMac
          ? [
              { type: 'separator' as const },
              { role: 'about' as const }
            ]
          : [])
      ]
    }
  ]

  const additions = commands['./features/command-palette/index.ts']?.desktopCommandMenu(mainWindow)
  if (additions?.length) template.push({ label: t('Commands'), submenu: additions })
  const roleKeys: Record<string, string> = {
    undo: 'Undo', redo: 'Redo', cut: 'Cut', copy: 'Copy', paste: 'Paste', delete: 'Delete',
    selectAll: 'Select All', quit: 'Quit', close: 'Close', reload: 'Reload', forceReload: 'Force Reload',
    toggleDevTools: 'Toggle Developer Tools', resetZoom: 'Actual Size', zoomIn: 'Zoom In', zoomOut: 'Zoom Out',
    togglefullscreen: 'Toggle Full Screen', minimize: 'Minimize', zoom: 'Zoom', about: 'About',
    services: 'Services', hide: 'Hide', hideOthers: 'Hide Others', unhide: 'Show All',
    front: 'Bring All to Front', pasteAndMatchStyle: 'Paste and Match Style', window: 'Window'
  }
  const localize = (items: Electron.MenuItemConstructorOptions[]) => {
    for (const item of items) {
      if (item.label) item.label = t(item.label)
      else if (item.role && roleKeys[item.role]) item.label = t(roleKeys[item.role])
      if (Array.isArray(item.submenu)) localize(item.submenu)
    }
  }
  localize(template)
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
