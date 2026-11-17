// Optional real Electron smoke check. Run AFTER building the worker entry:
// electron src/main/features/worker-process/native-check.cjs
// Linux CI needs an actual display or xvfb-run; do not disable sandbox in releases.
const { app, utilityProcess } = require('electron')
const { join } = require('node:path')
const { randomUUID } = require('node:crypto')
const assert = require('node:assert/strict')
app.disableHardwareAcceleration()
const entry = join(__dirname, '../../../../out/main/worker-process.cjs')
function run(limit, cancel) {
  return new Promise((resolve, reject) => {
    const child = utilityProcess.fork(entry, [], { stdio: 'ignore', execArgv: ['--max-old-space-size=64'] })
    const id = randomUUID()
    let result
    const timer = setTimeout(() => { child.kill(); reject(new Error('Native worker deadline exceeded')) }, 15000)
    child.on('spawn', () => { if (cancel) child.kill(); else child.postMessage({ id, limit }) })
    child.on('message', message => {
      if (message.id === id && message.type === 'result') { result = message.count; child.kill() }
    })
    child.once('exit', () => {
      clearTimeout(timer)
      if (cancel || result === 78498) resolve()
      else reject(new Error('Native worker did not produce the expected prime count'))
    })
  })
}
app.whenReady().then(async () => {
  await run(1000000, false)
  await run(10000000, true)
  assert.ok(true)
  console.log('Real Electron utility-process count and cancellation passed')
  app.exit(0)
}).catch(() => { console.error('Real Electron utility-process check failed'); app.exit(1) })
