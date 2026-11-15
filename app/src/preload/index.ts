import { contextBridge, ipcRenderer } from 'electron'
import { channels } from '../shared/channels'
import type { DesktopAPI } from '../shared/types'

const api: DesktopAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openFile: () => ipcRenderer.invoke(channels.openFile),
  saveFile: (defaultName, content) => ipcRenderer.invoke(channels.saveFile, defaultName, content),
  onCommand: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, command: string) => callback(command)
    ipcRenderer.on(channels.command, handler)
    return () => ipcRenderer.removeListener(channels.command, handler)
  }
}

contextBridge.exposeInMainWorld('api', api)
