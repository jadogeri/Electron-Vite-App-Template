import { contextBridge, ipcRenderer } from 'electron'
import { channels } from '../shared/channels'
import type { DesktopAPI, UpdateState } from '../shared/types'

const api: DesktopAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openFile: () => ipcRenderer.invoke(channels.openFile),
  saveFile: (defaultName, content) => ipcRenderer.invoke(channels.saveFile, defaultName, content),
  onCommand: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, command: string) => callback(command)
    ipcRenderer.on(channels.command, handler)
    return () => ipcRenderer.removeListener(channels.command, handler)
  },
  onUpdateStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, state: UpdateState) => callback(state)
    ipcRenderer.on(channels.updateStatus, handler)
    return () => ipcRenderer.removeListener(channels.updateStatus, handler)
  },
  installUpdate: () => ipcRenderer.invoke(channels.installUpdate)
}

contextBridge.exposeInMainWorld('api', api)
