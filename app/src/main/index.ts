import { app, BrowserWindow, ipcMain, screen, dialog, Menu } from 'electron'
import { join, basename } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { is, electronApp } from '@electron-toolkit/utils'
import { channels } from '../shared/channels'

function registerIPC(): void {
  ipcMain.handle('get-app-version', () => app.getVersion())

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

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  const appIcon =
    process.platform === 'win32'
      ? join(__dirname, '../../resources/icon.ico')
      : join(__dirname, '../../resources/icon.png')

  const mainWindow = new BrowserWindow({
    width: Math.min(1000, screenWidth),
    height: Math.min(800, screenHeight),
    minWidth: 600,
    minHeight: 500,
    center: true,
    icon: appIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.split('#')[0] !== mainWindow.webContents.getURL().split('#')[0]) event.preventDefault()
  })

  const command = (value: string) => mainWindow.webContents.send(channels.command, value)
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === 'darwin'
        ? [{ label: app.name, submenu: [{ role: 'about' as const }, { role: 'quit' as const }] }]
        : []),
      {
        label: 'File',
        submenu: [
          { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => command('open') },
          { label: 'Save…', accelerator: 'CmdOrCtrl+S', click: () => command('save') },
          { type: 'separator' },
          { role: 'quit' }
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
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'toggleDevTools' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' }
        ]
      }
    ])
  )

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.yourname.app')
  registerIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
