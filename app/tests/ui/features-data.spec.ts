import { test, expect, type Page } from '@playwright/test'
import { mockBridge } from './bridge'
import type { FeatureBridge } from '../../src/shared/features'

type DataHarness = {
  conflict(): void
  progress(value: number): void
  subscriberCount(): number
  failNotes(value: boolean): void
}
type HarnessWindow = Window & { __dataFeatures: DataHarness }

async function mockDataFeatures(page: Page) {
  await mockBridge(page)
  await page.addInitScript(() => {
    type Note = { id: string; title: string; body: string; createdAt: number; updatedAt: number }
    type Operation = { id: string; payload: { title: string }; state: string; attempts: number }
    type Job = { id: string; limit: number; progress: number; state: string; count: number | null }
    const subscribers = new Map<string, Set<(payload: unknown) => void>>()
    const emit = (feature: string, event: string, payload: unknown) => {
      for (const callback of subscribers.get(`${feature}:${event}`) ?? []) callback(structuredClone(payload))
    }
    let notes: Note[] = []
    let operations: Operation[] = []
    let jobs: Job[] = []
    let network = 'offline'
    let failNotes = false
    let sequence = 0
    const nextId = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`
    const syncStatus = () => ({ network, items: structuredClone(operations) })
    const notifySync = () => emit('offline-sync', 'status', syncStatus())
    const bridge: FeatureBridge = {
      list: async () => ['sqlite-db', 'offline-sync', 'worker-process'],
      on: (feature, event, callback) => {
        const key = `${feature}:${event}`
        const handlers = subscribers.get(key) ?? new Set<(payload: unknown) => void>()
        subscribers.set(key, handlers); handlers.add(callback)
        return () => { handlers.delete(callback) }
      },
      call: async <T>(feature: string, method: string, input?: unknown): Promise<T> => {
        const value = (input ?? {}) as Record<string, unknown>
        let result: unknown = null
        if (feature === 'sqlite-db') {
          if (failNotes) throw new Error('Controlled notes failure')
          if (method === 'list') result = structuredClone(notes)
          else if (method === 'create') {
            const note: Note = { id: nextId(), title: String(value.title), body: String(value.body), createdAt: 1, updatedAt: 1 }
            notes.push(note); result = structuredClone(note)
          } else if (method === 'update') {
            const note = notes.find(row => row.id === value.id)
            if (note) { note.title = String(value.title); note.body = String(value.body); note.updatedAt = 2 }
            result = structuredClone(note ?? null)
          } else if (method === 'remove') {
            const before = notes.length
            notes = notes.filter(row => row.id !== value.id); result = notes.length < before
          } else throw new Error('Unexpected notes method')
        } else if (feature === 'offline-sync') {
          if (method === 'status') result = syncStatus()
          else if (method === 'onlineHint') {
            // Browser hints alone do not prove backend reachability.
            if (!value.online) { network = 'offline'; notifySync() }
          } else if (method === 'enqueue') {
            const item: Operation = { id: nextId(), payload: { title: String(value.title) }, state: 'pending', attempts: 0 }
            operations.push(item); result = item.id; notifySync()
          } else if (method === 'resolve') {
            if (value.action === 'discard') operations = operations.filter(item => item.id !== value.id)
            else {
              const item = operations.find(row => row.id === value.id)
              if (item) { item.state = 'pending'; item.attempts = 0 }
            }
            notifySync(); result = syncStatus()
          } else if (method === 'drain') {
            network = 'online'; operations = []; notifySync(); result = syncStatus()
          } else throw new Error('Unexpected sync method')
        } else if (feature === 'worker-process') {
          if (method === 'status') result = structuredClone(jobs)
          else if (method === 'start') {
            if (jobs.filter(job => job.state === 'running').length >= 2) throw new Error('Busy')
            const job: Job = { id: nextId(), limit: Number(value.limit), progress: 0, state: 'running', count: null }
            jobs.push(job); emit(feature, 'job', job); result = { id: job.id }
          } else if (method === 'cancel') {
            const job = jobs.find(row => row.id === value.id)
            if (job) { job.state = 'cancelled'; emit(feature, 'job', job) }
            result = Boolean(job)
          } else throw new Error('Unexpected worker method')
        } else throw new Error('Unexpected feature')
        return result as T
      }
    }
    const target = window as unknown as { features: FeatureBridge; __dataFeatures: DataHarness }
    target.features = bridge
    target.__dataFeatures = {
      conflict() {
        network = 'online'
        const first = operations[0]
        if (first) { first.state = 'conflict'; first.attempts = 1 }
        notifySync()
      },
      progress(value) {
        const first = jobs.find(job => job.state === 'running')
        if (first) { first.progress = value; emit('worker-process', 'job', first) }
      },
      subscriberCount: () => [...subscribers.values()].reduce((count, handlers) => count + handlers.size, 0),
      failNotes: value => { failNotes = value }
    }
  })
}

test.beforeEach(async ({ page }) => { await mockDataFeatures(page) })

test('Features route renders local notes and supports create, edit and delete through the form', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Features', exact: true }).click()
  await expect(page).toHaveURL(/#\/features$/)
  const notes = page.getByRole('region', { name: 'Local SQLite notes' })
  await expect(notes.getByRole('heading', { name: 'Local notes', exact: true })).toBeVisible()
  await notes.getByLabel('Title', { exact: true }).fill('Browser note')
  await notes.getByLabel('Note', { exact: true }).fill('Original body')
  await notes.getByRole('button', { name: 'Add note', exact: true }).click()
  await expect(notes.getByRole('heading', { name: 'Browser note', exact: true })).toBeVisible()
  await expect(notes.getByText('Original body', { exact: true })).toBeVisible()
  await expect(notes.getByLabel('Title', { exact: true })).toHaveValue('')
  await notes.getByRole('button', { name: 'Edit Browser note', exact: true }).click()
  await expect(notes.getByLabel('Title', { exact: true })).toHaveValue('Browser note')
  await notes.getByLabel('Title', { exact: true }).fill('Edited note')
  await notes.getByLabel('Note', { exact: true }).fill('Updated body')
  await notes.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(notes.getByRole('heading', { name: 'Edited note', exact: true })).toBeVisible()
  await expect(notes.getByText('Original body', { exact: true })).toHaveCount(0)
  await expect(notes.getByText('Updated body', { exact: true })).toBeVisible()
  await notes.getByRole('button', { name: 'Delete Edited note', exact: true }).click()
  await expect(notes.getByRole('heading', { name: 'Edited note', exact: true })).toHaveCount(0)
})

test('Notes save failures show an actionable alert without losing the draft', async ({ page }) => {
  await page.goto('/#/features')
  const notes = page.getByRole('region', { name: 'Local SQLite notes' })
  await expect(notes.getByRole('button', { name: 'Add note', exact: true })).toBeVisible()
  await notes.getByLabel('Title', { exact: true }).fill('Keep my draft')
  await notes.getByLabel('Note', { exact: true }).fill('Unsaved body')
  await page.evaluate(() => (window as unknown as HarnessWindow).__dataFeatures.failNotes(true))
  await notes.getByRole('button', { name: 'Add note', exact: true }).click()
  await expect(notes.getByRole('alert')).toContainText('Could not save the note')
  await expect(notes.getByLabel('Title', { exact: true })).toHaveValue('Keep my draft')
  await expect(notes.getByLabel('Note', { exact: true })).toHaveValue('Unsaved body')
})

test('Offline queue exposes conflict and explicit retry before verified delivery', async ({ page }) => {
  await page.goto('/#/features')
  const sync = page.getByRole('region', { name: 'Offline synchronization' })
  await expect(sync.getByRole('status')).toContainText('Backend: offline')
  await sync.getByLabel('Operation title', { exact: true }).fill('Queued change')
  await sync.getByLabel('Text', { exact: true }).fill('An offline edit')
  await sync.getByRole('button', { name: 'Queue operation', exact: true }).click()
  await expect(sync.getByRole('status')).toContainText('Pending operations: 1')
  await expect(sync.getByRole('listitem')).toContainText('Queued change: pending (0/5 attempts)')
  await page.evaluate(() => (window as unknown as HarnessWindow).__dataFeatures.conflict())
  await expect(sync.getByRole('listitem')).toContainText('Queued change: conflict (1/5 attempts)')
  await expect(sync.getByText(/Resolve the server-side conflict before retrying/)).toBeVisible()
  await sync.getByRole('button', { name: 'Retry Queued change', exact: true }).click()
  await expect(sync.getByRole('listitem')).toContainText('Queued change: pending (0/5 attempts)')
  await expect(sync.getByRole('button', { name: 'Retry Queued change', exact: true })).toHaveCount(0)
  await sync.getByRole('button', { name: 'Verify backend and sync', exact: true }).click()
  await expect(sync.getByRole('status')).toContainText('Backend: online. Pending operations: 0')
  await expect(sync.getByRole('listitem')).toHaveCount(0)
})

test('Background worker UI shows progress, enforces concurrency and cancels jobs', async ({ page }) => {
  await page.goto('/#/features')
  const workers = page.getByRole('region', { name: 'Background CPU jobs' })
  await workers.getByLabel('Count primes up to', { exact: true }).fill('1000000')
  await workers.getByRole('button', { name: 'Start job', exact: true }).click()
  await expect(workers.getByRole('listitem')).toContainText('Primes up to 1000000: running')
  await page.evaluate(() => (window as unknown as HarnessWindow).__dataFeatures.progress(65))
  await expect(workers.getByRole('progressbar', { name: 'Progress counting primes up to 1000000', exact: true })).toHaveAttribute('value', '65')
  await workers.getByLabel('Count primes up to', { exact: true }).fill('2000000')
  await workers.getByRole('button', { name: 'Start job', exact: true }).click()
  await expect(workers.getByRole('button', { name: 'Start job', exact: true })).toBeDisabled()
  await workers.getByRole('button', { name: 'Cancel job up to 1000000', exact: true }).click()
  await expect(workers.getByRole('listitem').filter({ hasText: 'Primes up to 1000000:' })).toContainText('cancelled')
  await expect(workers.getByRole('button', { name: 'Cancel job up to 1000000', exact: true })).toHaveCount(0)
  await expect(workers.getByRole('button', { name: 'Start job', exact: true })).toBeEnabled()
  await workers.getByRole('button', { name: 'Cancel job up to 2000000', exact: true }).click()
  await expect(workers.getByRole('listitem').filter({ hasText: 'Primes up to 2000000:' })).toContainText('cancelled')
})

test('Leaving Features cleans up sync and worker event subscriptions', async ({ page }) => {
  await page.goto('/#/features')
  await expect(page.getByRole('region', { name: 'Offline synchronization' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Background CPU jobs' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as unknown as HarnessWindow).__dataFeatures.subscriberCount())).toBe(2)
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as unknown as HarnessWindow).__dataFeatures.subscriberCount())).toBe(0)
  await page.getByRole('link', { name: 'Features', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as HarnessWindow).__dataFeatures.subscriberCount())).toBe(2)
})
