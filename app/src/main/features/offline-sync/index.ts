import { app } from 'electron'
import { join } from 'node:path'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { JsonQueueStore, SyncQueue, parseConfig, payloadSchema } from './queue'

export default function offlineSync(context: FeatureContext): MainFeature {
  let queue: SyncQueue | undefined
  let issue: string | null = null
  try {
    queue = new SyncQueue(new JsonQueueStore(join(app.getPath('userData'), 'sync-queue.json')),
      parseConfig(process.env.APP_SYNC_BASE_URL), () => { if (queue) context.notify('status', queue.snapshot()) })
    queue.start()
  } catch {
    // Corrupt local storage or an invalid deployment URL must not crash the app.
    issue = 'Sync could not initialize. Check HTTPS backend configuration and preserve the queue file before storage recovery.'
  }
  const ready = () => {
    if (!queue) throw new Error('SYNC_UNAVAILABLE')
    return queue
  }
  return {
    methods: {
      status: procedure(z.void(), () => queue ? queue.snapshot() : { network: 'unavailable', items: [], issue }),
      enqueue: procedure(payloadSchema, input => { const id = ready().enqueue(input); void ready().drain().catch(() => {}); return id }),
      onlineHint: procedure(z.object({ online: z.boolean() }).strict(), input => { ready().setOnlineHint(input.online); return null }),
      drain: procedure(z.void(), async () => { await ready().drain(); return ready().snapshot() }),
      resolve: procedure(z.object({ id: z.string().uuid(), action: z.enum(['retry', 'discard']) }).strict(), input => {
        ready().resolve(input.id, input.action); void ready().drain().catch(() => {}); return ready().snapshot()
      })
    },
    shutdown: () => queue?.stop(),
    beforeQuit: () => { void queue?.stop().catch(() => {}) }
  }
}
