import { app, BrowserWindow } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerIPC } from './ipc'
import { registerAppMenu } from './menu'
import { registerUpdater } from './updater'

function initWindow(): void {
  const mainWindow = createMainWindow()
  registerAppMenu(mainWindow)
  registerUpdater(mainWindow)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.josephadogeridev.electronapp')

  registerIPC()
  initWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      initWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
