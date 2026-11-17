import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { jobInput, workerMessage, type JobState } from './protocol'

export interface Child extends EventEmitter {
  postMessage(message: unknown): void
  kill(): boolean
}
type Job = { child: Child; value: JobState; timer: ReturnType<typeof setTimeout>; settle: (state: JobState['state'], count?: number) => void }
export class JobManager {
  private running = new Map<string, Job>()
  private history: JobState[] = []
  private closed = false
  constructor(private readonly spawn: () => Child, private readonly notify: (state: JobState) => void,
    private readonly timeoutMs = 15_000) {}
  start(input: unknown) {
    if (this.closed) throw new Error('WORKER_STOPPED')
    const { limit } = jobInput.parse(input)
    if (this.running.size >= 2) throw new Error('WORKER_BUSY')
    const id = randomUUID()
    const child = this.spawn()
    const value: JobState = { id, limit, progress: 0, state: 'running', count: null }
    let resolve!: (state: JobState) => void
    const done = new Promise<JobState>(complete => { resolve = complete })
    let settled = false
    const settle = (state: JobState['state'], count: number | null = null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.removeListener('message', onMessage)
      child.removeListener('exit', onExit)
      value.state = state; value.count = count
      if (state === 'completed') value.progress = 100
      this.running.delete(id)
      this.history.unshift({ ...value }); this.history.length = Math.min(this.history.length, 50)
      try { child.kill() } catch { /* Child may already have exited. */ }
      resolve({ ...value })
      this.notify({ ...value })
    }
    const onMessage = (payload: unknown) => {
      const parsed = workerMessage.safeParse(payload)
      if (!parsed.success || parsed.data.id !== id) return
      const message = parsed.data
      if (message.type === 'progress') {
        if (message.progress < value.progress) return
        value.progress = message.progress; this.notify({ ...value })
      } else if (message.type === 'result') settle('completed', message.count)
      else settle('crashed')
    }
    const onExit = () => settle('crashed')
    const timer = setTimeout(() => settle('timed-out'), this.timeoutMs)
    this.running.set(id, { child, value, timer, settle })
    child.on('message', onMessage); child.once('exit', onExit)
    try { child.postMessage({ id, limit }) } catch { settle('crashed') }
    if (!settled) this.notify({ ...value })
    return { id, done }
  }
  cancel(id: string) {
    const job = this.running.get(id)
    if (!job) return false
    job.settle('cancelled'); return true
  }
  snapshot() { return [...this.running.values()].map(job => ({ ...job.value })).concat(this.history.map(job => ({ ...job }))) }
  shutdown() {
    this.closed = true
    for (const job of [...this.running.values()]) job.settle('cancelled')
  }
}
