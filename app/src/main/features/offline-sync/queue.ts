import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, openSync, closeSync, fsyncSync, readFileSync, renameSync, unlinkSync, writeFileSync, statSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod'

export const payloadSchema = z.object({
  title: z.string().trim().min(1).max(160),
  text: z.string().max(4096)
}).strict()
export const operationSchema = z.object({
  id: z.string().uuid(), payload: payloadSchema,
  createdAt: z.number().int().nonnegative(),
  attempts: z.number().int().min(0).max(5),
  nextAt: z.number().int().nonnegative(),
  state: z.enum(['pending', 'retrying', 'conflict', 'failed'])
}).strict()
export type Operation = z.infer<typeof operationSchema>
export type Store = { load(): Operation[]; save(items: Operation[]): void }
export type NetworkState = 'not-configured' | 'unknown' | 'offline' | 'online'
export type SyncConfig = { healthUrl: string; operationsUrl: string }
export const MAX_ITEMS = 200
const MAX_BYTES = 5_000_000
export const RETENTION_MS = 7 * 24 * 3600_000

export function parseConfig(base: string | undefined): SyncConfig | undefined {
  if (!base) return undefined
  const url = new URL(base)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || base.length > 2048)
    throw new Error('SYNC_CONFIG_INVALID')
  const prefix = url.href.replace(/\/?$/, '/')
  return { healthUrl: new URL('health', prefix).href, operationsUrl: new URL('operations', prefix).href }
}
function validated(items: unknown) { return z.array(operationSchema).max(MAX_ITEMS).parse(items) }
export class JsonQueueStore implements Store {
  constructor(private readonly path: string) {}
  load() {
    try {
      if (!existsSync(this.path)) return []
      if (statSync(this.path).size > MAX_BYTES) throw new Error()
      return validated(JSON.parse(readFileSync(this.path, 'utf8')))
    } catch { throw new Error('SYNC_STORAGE_UNREADABLE: Preserve the queue file before recovery.') }
  }
  save(items: Operation[]) {
    const content = JSON.stringify(validated(items))
    if (Buffer.byteLength(content) > MAX_BYTES) throw new Error('SYNC_STORAGE_LIMIT')
    const temporary = `${this.path}.${randomUUID()}.tmp`
    let fd: number | undefined
    try {
      mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 })
      fd = openSync(temporary, 'wx', 0o600)
      writeFileSync(fd, content, 'utf8'); fsyncSync(fd); closeSync(fd); fd = undefined
      renameSync(temporary, this.path)
      if (process.platform !== 'win32') {
        const directory = openSync(dirname(this.path), 'r')
        try { fsyncSync(directory) } finally { closeSync(directory) }
      }
    } catch {
      throw new Error('SYNC_STORAGE_WRITE_FAILED')
    } finally {
      if (fd !== undefined) closeSync(fd)
      if (existsSync(temporary)) unlinkSync(temporary)
    }
  }
}

export type QueueDependencies = {
  fetch: typeof fetch
  now: () => number
  random: () => number
  setTimer: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void
}
const defaults: QueueDependencies = {
  fetch: (...args) => fetch(...args), now: Date.now, random: Math.random,
  setTimer: (fn, ms) => setTimeout(fn, ms), clearTimer: clearTimeout
}
export class SyncQueue {
  private items: Operation[]
  private network: NetworkState
  private draining: Promise<void> | undefined
  private stopped = false
  private started = false
  private controller?: AbortController
  private timer?: ReturnType<typeof setTimeout>
  private hint = true
  constructor(private readonly store: Store, private readonly config?: SyncConfig,
    private readonly changed: () => void = () => {}, private readonly deps = defaults) {
    this.items = validated(store.load())
    this.network = config ? 'unknown' : 'not-configured'
  }
  snapshot() { return { network: this.network, items: this.items.map(item => ({ ...item, payload: { title: item.payload.title } })) } }
  private commit(next: Operation[]) {
    this.store.save(next)
    this.items = next
    this.changed()
  }
  enqueue(payload: unknown) {
    if (this.stopped) throw new Error('SYNC_STOPPED')
    if (this.items.length >= MAX_ITEMS) throw new Error('SYNC_QUEUE_FULL')
    const now = this.deps.now()
    const item: Operation = { id: randomUUID(), payload: payloadSchema.parse(payload), createdAt: now, attempts: 0, nextAt: now, state: 'pending' }
    this.commit([...this.items, item])
    return item.id
  }
  resolve(id: string, action: 'retry' | 'discard') {
    z.string().uuid().parse(id)
    const item = this.items.find(entry => entry.id === id)
    if (!item || !['failed', 'conflict'].includes(item.state)) throw new Error('SYNC_RESOLUTION_INVALID')
    this.commit(action === 'discard' ? this.items.filter(entry => entry.id !== id) :
      this.items.map(entry => entry.id === id ? { ...entry, attempts: 0, nextAt: this.deps.now(), createdAt: this.deps.now(), state: 'pending' } : entry))
  }
  private async request(url: string, init: RequestInit) {
    const controller = new AbortController()
    this.controller = controller
    const timeout = this.deps.setTimer(() => controller.abort(), 5000)
    try {
      return await this.deps.fetch(url, { ...init, redirect: 'error', signal: controller.signal, credentials: 'omit' })
    } finally { this.deps.clearTimer(timeout); this.controller = undefined }
  }
  drain(): Promise<void> {
    if (this.draining) return this.draining
    const run = this.run()
    this.draining = run
    void run.finally(() => { this.draining = undefined }).catch(() => {})
    return run
  }
  private async run() {
    if (this.stopped || !this.config || !this.hint) return
    try {
      const health = await this.request(this.config.healthUrl, { method: 'GET', cache: 'no-store' })
      // Explicit backend contract: only an HTTP 204 response proves readiness.
      await health.body?.cancel()
      if (health.status !== 204) throw new Error('UNHEALTHY')
      this.network = 'online'
    } catch { this.network = 'offline'; this.changed(); return }
    this.changed()
    for (const original of [...this.items]) {
      if (this.stopped || !this.hint) break
      const item = this.items.find(entry => entry.id === original.id)
      if (!item || item.state === 'conflict' || item.state === 'failed') continue
      if (this.deps.now() - item.createdAt >= RETENTION_MS || item.attempts >= 5) {
        this.commit(this.items.map(entry => entry.id === item.id ? { ...entry, state: 'failed' } : entry)); continue
      }
      if (item.nextAt > this.deps.now()) continue
      const attempt = item.attempts + 1
      // Persist attempt BEFORE sending; ambiguity on crash always retains the ID.
      this.commit(this.items.map(entry => entry.id === item.id ? { ...entry, attempts: attempt, state: 'retrying' } : entry))
      let status = 0
      try {
        const result = await this.request(this.config.operationsUrl, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.id },
          body: JSON.stringify({ id: item.id, payload: item.payload })
        })
        status = result.status
        await result.body?.cancel()
      } catch { this.network = 'offline' }
      if (this.stopped) break
      if (status >= 200 && status < 300) {
        this.commit(this.items.filter(entry => entry.id !== item.id))
      } else {
        const state = status === 409 ? 'conflict' :
          (attempt >= 5 || (status >= 400 && status < 500 && ![408, 429].includes(status))) ? 'failed' : 'retrying'
        const delay = Math.min(60_000, 1000 * 2 ** (attempt - 1)) + Math.floor(this.deps.random() * 251)
        this.commit(this.items.map(entry => entry.id === item.id ? { ...entry, state, nextAt: this.deps.now() + delay } : entry))
      }
      if (!status) break
    }
  }
  setOnlineHint(online: boolean) {
    this.hint = online
    if (!online) { this.controller?.abort(); this.network = this.config ? 'offline' : 'not-configured'; this.changed() }
    else void this.drain().catch(() => {})
  }
  start() {
    if (this.stopped || this.started) return
    this.started = true
    const tick = () => {
      if (this.stopped) return
      void this.drain().catch(() => {}).finally(() => {
        if (!this.stopped) this.timer = this.deps.setTimer(tick, 5000)
      })
    }
    tick()
  }
  async stop() {
    this.stopped = true
    if (this.timer) this.deps.clearTimer(this.timer)
    this.controller?.abort()
    await this.draining
  }
}
