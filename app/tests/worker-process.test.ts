import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { JobManager, type Child } from '../src/main/features/worker-process/manager'
import { countPrimes } from '../src/main/features/worker-process/protocol'

class ProcessHarness extends EventEmitter implements Child {
  request: { id: string; limit: number } | undefined
  killed = false
  postMessage(message: unknown) { this.request = message as typeof this.request }
  kill() { this.killed = true; return true }
}
test('Actual bounded CPU algorithm returns known prime counts and yields progress', async () => {
  assert.equal(await countPrimes(1000, () => {}), 168)
  const progress: number[] = []
  let yields = 0
  assert.equal(await countPrimes(100_000, value => progress.push(value), async () => { yields++ }), 9592)
  assert.equal(progress.at(-1), 100)
  assert.ok(yields > 0)
  assert.deepEqual(progress, [...progress].sort((a, b) => a - b))
  await assert.rejects(countPrimes(10_000_001, () => {}))
})
test('Manager ignores stale/malformed progress, correlates result and releases every listener', async () => {
  const child = new ProcessHarness()
  const manager = new JobManager(() => child, () => {})
  const job = manager.start({ limit: 1000 })
  child.emit('message', { type: 'progress', id: 'stale', progress: 99 })
  child.emit('message', { type: 'progress', id: job.id, progress: 101 })
  assert.equal(manager.snapshot()[0].progress, 0)
  child.emit('message', { type: 'progress', id: job.id, progress: 50 })
  child.emit('message', { type: 'progress', id: job.id, progress: 10 })
  assert.equal(manager.snapshot()[0].progress, 50)
  child.emit('message', { type: 'result', id: job.id, count: 168 })
  assert.equal((await job.done).count, 168)
  assert.equal(child.killed, true)
  assert.equal(child.listenerCount('message'), 0)
  assert.equal(child.listenerCount('exit'), 0)
  child.emit('exit', 1)
  assert.equal(manager.snapshot()[0].state, 'completed')
})
test('Manager enforces input bounds/concurrency, cancellation, crash and shutdown settlement', async () => {
  const children: ProcessHarness[] = []
  const manager = new JobManager(() => { const child = new ProcessHarness(); children.push(child); return child }, () => {})
  assert.throws(() => manager.start({ limit: 999 }))
  assert.throws(() => manager.start({ limit: 1000, code: 'arbitrary' }))
  const first = manager.start({ limit: 1000 }); const second = manager.start({ limit: 1000 })
  assert.throws(() => manager.start({ limit: 1000 }), /WORKER_BUSY/)
  assert.equal(manager.cancel(first.id), true)
  assert.equal((await first.done).state, 'cancelled')
  children[1].emit('exit', 1)
  assert.equal((await second.done).state, 'crashed')
  const third = manager.start({ limit: 1000 })
  manager.shutdown()
  assert.equal((await third.done).state, 'cancelled')
  assert.ok(children.every(child => child.killed && child.listenerCount('message') === 0 && child.listenerCount('exit') === 0))
  assert.throws(() => manager.start({ limit: 1000 }), /WORKER_STOPPED/)
})
test('Deadline settles hung jobs and repeated jobs retain bounded history only', async () => {
  const manager = new JobManager(() => new ProcessHarness(), () => {}, 5)
  assert.equal((await manager.start({ limit: 1000 }).done).state, 'timed-out')
  for (let n = 0; n < 60; n++) { const job = manager.start({ limit: 1000 }); manager.cancel(job.id); await job.done }
  assert.equal(manager.snapshot().length, 50)
  manager.shutdown()
})
test('Synchronous send failure settles and frees concurrency', async () => {
  const manager = new JobManager(() => {
    const child = new ProcessHarness()
    child.postMessage = () => { throw new Error('process already exited') }
    return child
  }, () => {})
  assert.equal((await manager.start({ limit: 1000 }).done).state, 'crashed')
  manager.shutdown()
})
