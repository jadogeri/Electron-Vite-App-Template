import { contextBridge, ipcRenderer } from 'electron'
import { channels } from '../shared/channels'
import type { DesktopAPI, UpdateState } from '../shared/types'
import type { IPCContract } from '../shared/ipc-contract'

function invoke<K extends keyof IPCContract>(key: K, ...args: IPCContract[K]['args']): Promise<IPCContract[K]['result']> {
  return ipcRenderer.invoke(channels[key], ...args)
}

const api: DesktopAPI = {
  getAppVersion: () => invoke('getVersion'),
  openFile: () => invoke('openFile'),
  saveFile: (defaultName, content) => invoke('saveFile', defaultName, content),
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
  installUpdate: () => invoke('installUpdate'),
  getUpdateState: () => invoke('getUpdateState'),
  checkForUpdates: () => invoke('checkForUpdates'),
  getSettings: () => invoke('getSettings'),
  setTheme: (theme) => invoke('setTheme', theme),
  onThemeChanged: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, dark: boolean) => callback(dark)
    ipcRenderer.on(channels.themeChanged, handler)
    return () => ipcRenderer.removeListener(channels.themeChanged, handler)
  },
  onToast: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, message: string) => callback(message)
    ipcRenderer.on(channels.toast, handler)
    return () => ipcRenderer.removeListener(channels.toast, handler)
  }
}

contextBridge.exposeInMainWorld('api', api)
