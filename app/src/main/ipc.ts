import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { basename } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { channels } from '../shared/channels'

export function registerIPC(): void {

  ipcMain.handle(channels.getVersion , () => app.getVersion())

  ipcMain.handle(channels.openFile, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    return {
      path: filePath,
      name: basename(filePath),
      text: await readFile(filePath, 'utf8')
    }
  })

  ipcMain.handle(channels.saveFile, async (event, defaultName: string, content: string) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return false

    const result = await dialog.showSaveDialog(window, { defaultPath: defaultName })
    if (result.canceled || !result.filePath) return false

    await writeFile(result.filePath, content, 'utf8')
    return true
  })
}
