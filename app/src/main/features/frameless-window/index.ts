import { BrowserWindow } from 'electron'
import Store from 'electron-store'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { splashHTML, splashLifetime } from './lifecycle'
import { controlSchema, enabledSchema } from './validation'

export default function framelessWindow(_context: FeatureContext): MainFeature {
  const store = new Store({ name: 'feature-frameless-window', clearInvalidConfig: true })
  const enabled = store.get('enabled', false) === true
  const splashes = new Map<BrowserWindow, () => void>()
  const owningWindow = (event: Electron.IpcMainInvokeEvent) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window || window.isDestroyed()) throw new Error('Window unavailable')
    return window
  }
  return {
    // Native frames stay the default. On macOS retain the native traffic lights.
    windowOptions: enabled
      ? process.platform === 'darwin'
        ? { titleBarStyle: 'hiddenInset' }
        : { frame: false }
      : {},
    methods: {
      state: procedure(z.void(), (_input, event) => ({
        enabled, nextStartEnabled: store.get('enabled', false) === true,
        platform: process.platform, maximized: owningWindow(event).isMaximized()
      })),
      setEnabled: procedure(enabledSchema, ({ enabled: next }) => {
        store.set('enabled', next)
        return { restartRequired: next !== enabled, nextStartEnabled: next }
      }),
      control: procedure(controlSchema, (action, event) => {
        const window = owningWindow(event)
        if (!enabled) throw new Error('Custom controls are disabled')
        if (action === 'minimize') window.minimize()
        if (action === 'maximize') window.isMaximized() ? window.unmaximize() : window.maximize()
        if (action === 'close') window.close()
        return true
      })
    },
    attachWindow(window) {
      if (splashes.has(window)) return
      let splash: BrowserWindow
      try {
        splash = new BrowserWindow({
          width: 360, height: 200, frame: false, resizable: false,
          show: false, skipTaskbar: true, alwaysOnTop: false,
          webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
        })
      } catch { return } // Keep the main window usable if a splash cannot be created.
      const finish = splashLifetime(
        () => {
          if (!splash.isDestroyed()) splash.destroy()
          window.removeListener('ready-to-show', ready)
          window.removeListener('closed', closed)
          window.webContents.removeListener('did-fail-load', failure)
          window.webContents.removeListener('render-process-gone', failure)
          splashes.delete(window)
        },
        () => { if (!window.isDestroyed()) window.destroy() },
        callback => { const timer = setTimeout(callback, 15_000); timer.unref(); return () => clearTimeout(timer) }
      )
      const ready = () => finish('ready')
      const closed = () => finish('closed')
      const failure = () => finish('failed')
      splashes.set(window, () => finish('shutdown'))
      window.once('ready-to-show', ready)
      window.once('closed', closed)
      window.webContents.once('did-fail-load', failure)
      window.webContents.once('render-process-gone', failure)
      splash.once('ready-to-show', () => {
        if (!splash.isDestroyed() && !window.isDestroyed() && !window.isVisible()) splash.show()
      })
      void splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`).catch(failure)
    },
    beforeQuit() { for (const close of [...splashes.values()]) close() },
    shutdown() { for (const close of [...splashes.values()]) close() }
  }
}
