import { app, BrowserWindow } from 'electron'
import updater from 'electron-updater'
import { channels } from '../shared/channels'
import { updatePercent } from '../shared/validation'
import { assertTrustedSender } from './trust'
import { log } from './logger'
import { handle } from './handle'
import type { UpdateState } from '../shared/types'
import { createUpdateErrorReporter, performUpdateCheck } from './update-errors'
import { getMainWindows, prepareFeatureQuit, shutdownFeatures } from './feature-host'
import { configureUpdateChannels, isCandidateAllowed, updateChannelActivity } from './update-channel-adapter'

const { autoUpdater } = updater

let registered = false
let state: UpdateState = { status: 'idle' }

function sendState(next: UpdateState): void {
  state = next
  updateChannelActivity(next.status)
  for (const window of getMainWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channels.updateStatus, state)
  }
}

const reportUpdateError = createUpdateErrorReporter(sendState, log)

export async function checkForUpdates(): Promise<void> {
  if (['checking', 'available', 'downloading', 'downloaded', 'installing'].includes(state.status)) return
  if (!app.isPackaged) {
    sendState({ status: 'not-available' })
    return
  }
  await performUpdateCheck(() => autoUpdater.checkForUpdates(), reportUpdateError)
}

export function registerUpdater(_mainWindow: BrowserWindow): void {
  if (registered) return
  registered = true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.logger = log
  configureUpdateChannels(autoUpdater)
  autoUpdater.on('checking-for-update', () => sendState({ status: 'checking' }))
  autoUpdater.on('update-available', (info) => {
    if (['available', 'downloading', 'downloaded', 'installing'].includes(state.status)) return
    if (!isCandidateAllowed(app.getVersion(), info.version)) { sendState({ status: 'not-available' }); return }
    sendState({ status: 'available', version: info.version })
    void autoUpdater.downloadUpdate().catch(error => reportUpdateError(error, 'update'))
  })
  autoUpdater.on('update-not-available', () => sendState({ status: 'not-available' }))
  autoUpdater.on('download-progress', (progress) =>
    sendState({ status: 'downloading', percent: updatePercent(progress.percent) }))
  autoUpdater.on('update-downloaded', (info) => {
    sendState(isCandidateAllowed(app.getVersion(), info.version) ? { status: 'downloaded', version: info.version } : { status: 'not-available' })
  })
  // A failed check both emits an error event and rejects its promise.
  // Both paths must classify the empty-feed case identically.
  autoUpdater.on('error', (error) =>
    reportUpdateError(error, state.status === 'checking' ? 'check' : 'update'))

  handle('getUpdateState', (event) => { assertTrustedSender(event); return state })
  handle('checkForUpdates', (event) => {
    assertTrustedSender(event)
    return checkForUpdates()
  })
  handle('installUpdate', async (event) => {
    assertTrustedSender(event)
    if (!app.isPackaged || state.status !== 'downloaded' || !isCandidateAllowed(app.getVersion(), state.version)) throw new Error('No downloaded update is ready')
    const previous = state
    sendState({ status: 'installing' })
    // Let the renderer paint the restart notice; installation continues in the native installer after exit.
    await new Promise((resolve) => setTimeout(resolve, 400))
    try {
      prepareFeatureQuit()
      await shutdownFeatures()
      autoUpdater.quitAndInstall()
    }
    catch {
      sendState(previous)
      throw new Error('Unable to restart for installation')
    }
  })
  if (app.isPackaged) void checkForUpdates()
}
