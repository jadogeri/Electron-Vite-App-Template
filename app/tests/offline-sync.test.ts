import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { JsonQueueStore, SyncQueue, parseConfig, MAX_ITEMS, RETENTION_MS, type Operation, type QueueDependencies, type Store } from '../src/main/features/offline-sync/queue'

const config = parseConfig('https://example.invalid/api/')!
class Memory implements Store {
  data: Operation[] = []
  load() { return structuredClone(this.data) }
  save(items: Operation[]) { this.data = structuredClone(items) }
}
function setup(responses: (number | 'throw')[] = []) {
  const store = new Memory()
  let now = 1000
  const calls: { url: string; init?: RequestInit }[] = []
  const timers = new Map<ReturnType<typeof setTimeout>, () => void>()
  let timerId = 0
  const deps: QueueDependencies = {
    now: () => now, random: () => 0.5,
    fetch: async (url, init) => {
      calls.push({ url: String(url), init })
      const status = responses.shift() ?? 204
      if (status === 'throw') throw new Error('network')
      return new Response(null, { status })
    },
    setTimer: callback => { const id = ++timerId as unknown as ReturnType<typeof setTimeout>; timers.set(id, callback); return id },
    clearTimer: id => { timers.delete(id) }
  }
  return { store, calls, timers, deps, advance: (ms: number) => { now += ms }, responses }
}
const payload = { title: 'safe example', text: 'plain sample text' }

test('Unconfigured sync stores locally, does not claim connectivity or call network', async () => {
  const fixture = setup()
  const queue = new SyncQueue(fixture.store, undefined, undefined, fixture.deps)
  queue.enqueue(payload)
  await queue.drain()
  assert.equal(queue.snapshot().network, 'not-configured')
  assert.equal(fixture.calls.length, 0)
  assert.equal(queue.snapshot().items.length, 1)
  assert.throws(() => parseConfig('http://example.invalid'))
  assert.throws(() => parseConfig('https://user:password@example.invalid'))
  await queue.stop()
})
test('Atomic disk queue survives restart and drains serially after verified health', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'sync-feature-'))
  try {
    const fixture = setup()
    const store = new JsonQueueStore(join(directory, 'queue.json'))
    const before = new SyncQueue(store, undefined, undefined, fixture.deps)
    const id = before.enqueue(payload)
    const after = new SyncQueue(store, config, undefined, fixture.deps)
    assert.equal(after.snapshot().items[0].id, id)
    const first = after.drain(); const second = after.drain()
    assert.equal(first, second)
    await Promise.all([first, second])
    assert.equal(after.snapshot().network, 'online')
    assert.equal(after.snapshot().items.length, 0)
    assert.deepEqual(store.load(), [])
    assert.deepEqual(readdirSync(directory), ['queue.json'])
    assert.deepEqual(fixture.calls.map(call => call.url), [config.healthUrl, config.operationsUrl])
    assert.equal((fixture.calls[1].init!.headers as Record<string, string>)['Idempotency-Key'], id)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
test('Ambiguous network failure persists attempt, exponential backoff and the same idempotency key', async () => {
  const fixture = setup([204, 'throw', 204, 204, 204])
  const queue = new SyncQueue(fixture.store, config, undefined, fixture.deps)
  const id = queue.enqueue(payload)
  await queue.drain()
  assert.equal(queue.snapshot().items[0].state, 'retrying')
  assert.equal(queue.snapshot().items[0].nextAt, 2125)
  // Restart immediately must respect the durable retry deadline.
  const restored = new SyncQueue(fixture.store, config, undefined, fixture.deps)
  await restored.drain()
  assert.equal(fixture.calls.filter(call => call.init?.method === 'POST').length, 1)
  fixture.advance(1125)
  await restored.drain()
  assert.equal(restored.snapshot().items.length, 0)
  assert.deepEqual(fixture.calls.filter(call => call.init?.method === 'POST').map(call =>
    (call.init!.headers as Record<string, string>)['Idempotency-Key']), [id, id])
})
test('Health failure is offline even if the browser hints online; 409 conflict stays visible', async () => {
  const fixture = setup([503, 204, 409])
  const queue = new SyncQueue(fixture.store, config, undefined, fixture.deps)
  const id = queue.enqueue(payload)
  await queue.drain()
  assert.equal(queue.snapshot().network, 'offline')
  assert.equal(fixture.calls.length, 1)
  await queue.drain()
  assert.equal(queue.snapshot().items[0].state, 'conflict')
  await queue.drain()
  assert.equal(fixture.calls.filter(call => call.init?.method === 'POST').length, 1)
  queue.resolve(id, 'retry')
  assert.equal(queue.snapshot().items[0].id, id)
  assert.equal(queue.snapshot().items[0].state, 'pending')
  await queue.stop()
})
test('Permanent failure, max retry count and expired retention stop automatic delivery', async () => {
  const fixture = setup([204, 422])
  const queue = new SyncQueue(fixture.store, config, undefined, fixture.deps)
  const first = queue.enqueue(payload)
  await queue.drain()
  assert.equal(queue.snapshot().items[0].state, 'failed')
  queue.resolve(first, 'discard')
  const retry = queue.enqueue(payload)
  for (let attempt = 0; attempt < 5; attempt++) {
    fixture.responses.push(204, 500)
    await queue.drain()
    fixture.advance(61_000)
  }
  assert.equal(queue.snapshot().items.find(item => item.id === retry)?.attempts, 5)
  assert.equal(queue.snapshot().items[0].state, 'failed')
  const expired = queue.enqueue(payload)
  fixture.advance(RETENTION_MS)
  await queue.drain()
  assert.equal(queue.snapshot().items.find(item => item.id === expired)?.state, 'failed')
})
test('Timeout and shutdown abort in-flight HTTP without losing the persisted operation', async () => {
  const fixture = setup()
  let aborted = false
  fixture.deps.fetch = async (_url, init) => new Promise((_resolve, reject) => {
    init!.signal!.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')) }, { once: true })
  })
  const queue = new SyncQueue(fixture.store, config, undefined, fixture.deps)
  queue.enqueue(payload)
  const drain = queue.drain()
  for (const callback of fixture.timers.values()) callback()
  await drain
  assert.equal(aborted, true)
  assert.equal(queue.snapshot().items.length, 1)
  aborted = false
  const next = queue.drain()
  await queue.stop()
  await next
  assert.equal(aborted, true)
  assert.equal(fixture.timers.size, 0)
  assert.throws(() => queue.enqueue(payload), /SYNC_STOPPED/)
})
test('Queue bounds reject overflow, malformed payloads and credential-shaped fields', () => {
  const fixture = setup()
  const queue = new SyncQueue(fixture.store)
  assert.throws(() => queue.enqueue({ ...payload, token: 'not-accepted' }))
  assert.throws(() => queue.enqueue({ title: 'ok', text: 'x'.repeat(4097) }))
  for (let n = 0; n < MAX_ITEMS; n++) queue.enqueue(payload)
  assert.throws(() => queue.enqueue(payload), /SYNC_QUEUE_FULL/)
})
test('Storage failure never acknowledges an enqueue or drops pending work', () => {
  const store = new Memory()
  const queue = new SyncQueue(store)
  const id = queue.enqueue(payload)
  store.save = () => { throw new Error('disk full') }
  assert.throws(() => queue.enqueue(payload), /disk full/)
  assert.deepEqual(queue.snapshot().items.map(item => item.id), [id])
})
