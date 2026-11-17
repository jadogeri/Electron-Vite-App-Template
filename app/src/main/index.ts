import { app, nativeTheme } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerIPC } from './ipc'
import { registerAppMenu } from './menu'
import { registerUpdater } from './updater'
import { getSettings } from './settings'
import { registerLogger } from './logger'
import { dispatchProtocol, featuresKeepAlive, getMainWindows, prepareFeatureQuit, setMenuRefresher, setupFeatures, shutdownFeatures } from './feature-host'
import { boundedCallback } from './protocol'
import { createRequire } from 'node:module'
import { join } from 'node:path'

let ready = false
let exiting = false
const callbacks: string[] = []
const pending = new Set<string>()
function capture(value: string): void {
  const url = boundedCallback(value)
  if (!url || pending.has(url) || callbacks.length >= 8) return
  pending.add(url); callbacks.push(url)
  if (ready) void drain()
}
let draining = false
async function drain(): Promise<void> {
  if (draining) return
  draining = true
  try {
    while (callbacks.length) {
      const url = callbacks.shift()!
      try { await dispatchProtocol(url) } catch { /* Never log authentication callbacks. */ }
      finally { pending.delete(url) }
    }
  } finally { draining = false }
}
function initWindow(): void {
  const mainWindow = createMainWindow()
  registerAppMenu(mainWindow)
  registerUpdater(mainWindow)
}
function focusMain(): void {
  let window = getMainWindows()[0]
  if (!window && ready) { initWindow(); window = getMainWindows()[0] }
  if (!window) return
  if (window.isMinimized()) window.restore()
  window.show(); window.focus()
}
if (process.argv.includes('--native-smoke')) {
  const smoke = createRequire(import.meta.url)(join(app.getAppPath(), 'scripts/native-smoke.cjs'))
  void smoke.runNativeSmokeAndExit({ packaged: app.isPackaged })
} else {
app.on('open-url', (event, url) => { event.preventDefault(); capture(url); focusMain() })
for (const argument of process.argv.slice(1)) capture(argument)
if (!app.requestSingleInstanceLock()) app.quit()
else {
  registerLogger()
  app.on('second-instance', (_event, argv) => { argv.forEach(capture); focusMain() })
  app.whenReady().then(async () => {
    electronApp.setAppUserModelId('com.josephadogeridev.electronapp')
    // Independent non-auth branches must not claim the authentication scheme.
    const hasAuth = Object.keys(import.meta.glob('./features/auth-security/index.ts')).length > 0
    if (hasAuth) {
      if (process.defaultApp && process.argv[1]) {
        app.setAsDefaultProtocolClient('electron-vite-template', process.execPath, [process.argv[1]])
      } else app.setAsDefaultProtocolClient('electron-vite-template')
    }
    nativeTheme.themeSource = getSettings().theme
    setMenuRefresher(() => { const window = getMainWindows()[0]; if (window) registerAppMenu(window) })
    await setupFeatures()
    registerIPC()
    ready = true
    initWindow()
    await drain()
    app.on('activate', focusMain)
  }).catch(() => { console.error('Application initialization failed'); app.quit() })
}
app.on('before-quit', event => {
  prepareFeatureQuit()
  if (exiting) return
  event.preventDefault()
  void shutdownFeatures().finally(() => { exiting = true; app.quit() })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !featuresKeepAlive()) app.quit()
})
}
