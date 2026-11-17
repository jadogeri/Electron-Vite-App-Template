const { spawnSync } = require('node:child_process')
const { join } = require('node:path')
const { existsSync } = require('node:fs')
const root = join(__dirname, '..', 'dist')
const paths = process.platform === 'win32'
  ? [join(root, 'win-unpacked', 'Electron Vite App Template.exe')]
  : process.platform === 'darwin'
    ? ['mac', 'mac-arm64', 'mac-universal'].map(folder => join(root, folder, 'Electron Vite App Template.app', 'Contents', 'MacOS', 'Electron Vite App Template'))
    : [join(root, 'linux-unpacked', 'electron-vite-app-template')]
const executable = paths.find(existsSync)
if (!executable) { console.error('Packaged application not found; build an unsigned directory first'); process.exit(1) }
const result = spawnSync(executable, ['--native-smoke'], {
  stdio: 'inherit', timeout: 60000,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }
})
if (result.error) console.error('Packaged native smoke could not finish')
process.exit(result.status ?? 1)
