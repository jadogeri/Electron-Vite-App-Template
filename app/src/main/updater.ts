import { BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'
import { channels } from '../shared/channels'
import type { UpdateState } from '../shared/types'

export function registerUpdater(mainWindow: BrowserWindow): void {
  const sendState = (state: UpdateState) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channels.updateStatus, state)
    }
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => sendState({ status: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    sendState({ status: 'available', version: info.version })
  )
  autoUpdater.on('update-not-available', () => sendState({ status: 'not-available' }))
  autoUpdater.on('download-progress', (progress) =>
    sendState({ status: 'downloading', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) =>
    sendState({ status: 'downloaded', version: info.version })
  )
  autoUpdater.on('error', (err) =>
    sendState({ status: 'error', message: err.message })
  )

  ipcMain.handle(channels.installUpdate, () => {
    autoUpdater.quitAndInstall()
  })

  // Only check for updates in packaged production builds
  if (!is.dev) {
    autoUpdater.checkForUpdatesAndNotify()
  }
}
