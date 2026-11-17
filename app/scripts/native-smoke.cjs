/* Real Electron smoke checks. This is NOT a Node-only test runner.
 *
 * Development/CI, from app/: electron scripts/native-smoke.cjs
 * Packaged main may invoke require(<packaged script>).runNativeSmoke({ packaged: true })
 * and terminate with app.exit(0/1). The integration owns packaging/entry wiring.
 */
const { app, utilityProcess } = require('electron')
const { createRequire } = require('node:module')
const { randomUUID } = require('node:crypto')
const { mkdtempSync, rmSync, existsSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')
const assert = require('node:assert/strict')

function smokeError(code) {
  const error = new Error(code)
  error.code = code
  return error
}

function checkSqlite(root) {
  // Resolve from the app package, not from a global test runner or this script.
  // Electron's native loader must load the actual target-ABI addon (including
  // ASAR-unpacked resolution in packaged mode).
  const requireFromApp = createRequire(join(root, 'package.json'))
  const Database = requireFromApp('better-sqlite3')
  const directory = mkdtempSync(join(tmpdir(), 'electron-native-smoke-'))
  const file = join(directory, 'native-smoke.sqlite3')
  let database
  try {
    database = new Database(file)
    database.pragma('busy_timeout = 1000')
    database.pragma('foreign_keys = ON')
    database.pragma('journal_mode = WAL')
    database.exec('CREATE TABLE smoke_notes(id TEXT PRIMARY KEY, body TEXT NOT NULL)')
    const id = randomUUID()
    database.transaction(() => {
      database.prepare('INSERT INTO smoke_notes(id,body) VALUES (?,?)').run(id, 'original')
      database.prepare('UPDATE smoke_notes SET body = ? WHERE id = ?').run('persisted', id)
    })()
    assert.equal(database.prepare('SELECT body FROM smoke_notes WHERE id = ?').get(id).body, 'persisted')
    database.pragma('wal_checkpoint(TRUNCATE)')
    database.close()
    database = undefined

    database = new Database(file)
    assert.equal(database.prepare('SELECT body FROM smoke_notes WHERE id = ?').get(id).body, 'persisted')
    assert.throws(() => database.transaction(() => {
      database.prepare('INSERT INTO smoke_notes(id,body) VALUES (?,?)').run(randomUUID(), 'rolled back')
      throw smokeError('SMOKE_EXPECTED_ROLLBACK')
    })())
    assert.equal(database.prepare('SELECT count(*) AS count FROM smoke_notes').get().count, 1)
    assert.equal(database.prepare('DELETE FROM smoke_notes WHERE id = ?').run(id).changes, 1)
    assert.equal(database.prepare('SELECT count(*) AS count FROM smoke_notes').get().count, 0)
  } finally {
    try { if (database?.open) database.close() }
    finally { rmSync(directory, { recursive: true, force: true }) }
  }
}

function checkUtilityProcess(entry, cancel) {
  return new Promise((resolveCheck, rejectCheck) => {
    let child
    let timer
    let settled = false
    let result = null
    let progress = -1
    let cancellationRequested = false
    const id = randomUUID()
    const finish = error => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (child) {
        child.removeListener('spawn', onSpawn)
        child.removeListener('message', onMessage)
        child.removeListener('exit', onExit)
        try { child.kill() } catch { /* Already exited. */ }
      }
      if (error) rejectCheck(error)
      else resolveCheck()
    }
    const onSpawn = () => {
      try { child.postMessage({ id, limit: cancel ? 10_000_000 : 1_000_000 }) }
      catch { finish(smokeError('SMOKE_WORKER_SEND_FAILED')) }
    }
    const onMessage = message => {
      try {
        if (!message || message.id !== id) return
        if (message.type === 'progress') {
          assert.ok(Number.isFinite(message.progress) && message.progress >= progress && message.progress <= 100)
          progress = message.progress
          // Wait for real CPU progress before testing termination. This is not
          // merely creating and killing an unused child.
          if (cancel && !cancellationRequested) {
            cancellationRequested = true
            assert.equal(child.kill(), true)
          }
        } else if (message.type === 'result') {
          assert.equal(cancel, false, 'Cancelled native job completed unexpectedly')
          assert.equal(message.count, 78_498)
          result = message.count
          child.kill()
        } else {
          throw smokeError('SMOKE_WORKER_INVALID_MESSAGE')
        }
      } catch { finish(smokeError('SMOKE_WORKER_RESULT_INVALID')) }
    }
    const onExit = () => {
      if (cancel ? cancellationRequested && result === null : result === 78_498 && progress >= 0) finish()
      else finish(smokeError('SMOKE_WORKER_EXIT_INVALID'))
    }
    try {
      child = utilityProcess.fork(entry, [], {
        serviceName: cancel ? 'Native smoke cancellation' : 'Native smoke prime count',
        execArgv: ['--max-old-space-size=64'],
        stdio: 'ignore'
      })
      child.once('spawn', onSpawn)
      child.on('message', onMessage)
      child.once('exit', onExit)
      timer = setTimeout(() => finish(smokeError('SMOKE_WORKER_TIMEOUT')), 15_000)
    } catch { finish(smokeError('SMOKE_WORKER_START_FAILED')) }
  })
}

async function runNativeSmoke(options = {}) {
  if (!app || !utilityProcess) throw smokeError('SMOKE_REQUIRES_ELECTRON')
  await app.whenReady()
  const packaged = options.packaged === true || app.isPackaged
  const root = packaged ? app.getAppPath() : resolve(__dirname, '..')
  const entry = join(root, 'out', 'main', 'worker-process.cjs')
  const requireFromApp = createRequire(join(root, 'package.json'))
  let hasSqlite = false
  try { requireFromApp.resolve('better-sqlite3'); hasSqlite = true } catch {}
  const hasWorker = existsSync(entry)
  if (!hasSqlite && !hasWorker) throw smokeError('SMOKE_NO_NATIVE_FEATURE_SELECTED')
  if (hasSqlite) {
    checkSqlite(root)
    console.log('PASS native SQLite disk CRUD, rollback and reopen')
  } else console.log('SKIP SQLite (optional feature not selected)')
  if (hasWorker) {
    await checkUtilityProcess(entry, false)
    console.log('PASS native utility-process prime result')
    await checkUtilityProcess(entry, true)
    console.log('PASS native utility-process progress and cancellation')
  } else console.log('SKIP utility process (optional feature not selected)')
  return { sqlite: hasSqlite ? 'passed' : 'not-selected', utilityResult: hasWorker ? 'passed' : 'not-selected', utilityCancellation: hasWorker ? 'passed' : 'not-selected', packaged }
}

async function runNativeSmokeAndExit(options = {}) {
  if (!app || !utilityProcess) {
    console.error('FAIL native smoke requires the Electron runtime')
    process.exitCode = 1
    return
  }
  // Includes Electron readiness and both children; every exit is deterministic.
  // The per-child deadlines kill hung processes before this outer deadline.
  const deadline = setTimeout(() => {
    console.error('FAIL native smoke total deadline exceeded')
    app.exit(1)
  }, 40_000)
  app.disableHardwareAcceleration()
  try {
    await runNativeSmoke(options)
    clearTimeout(deadline)
    console.log('PASS all native smoke checks')
    app.exit(0)
  } catch {
    clearTimeout(deadline)
    // Never print driver errors, local paths, environment values or raw causes.
    console.error('FAIL native smoke; check native ABI, worker build output and desktop runtime availability')
    app.exit(1)
  }
}

module.exports = { runNativeSmoke, runNativeSmokeAndExit }
if (require.main === module) void runNativeSmokeAndExit({
  packaged: process.argv.includes('--native-smoke-packaged')
})
