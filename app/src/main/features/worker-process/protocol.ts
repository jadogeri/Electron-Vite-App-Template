import { z } from 'zod'

export const jobInput = z.object({ limit: z.number().int().min(1000).max(10_000_000) }).strict()
export const workerRequest = jobInput.extend({ id: z.string().uuid() }).strict()
export const workerMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('progress'), id: z.string().uuid(), progress: z.number().min(0).max(100) }).strict(),
  z.object({ type: z.literal('result'), id: z.string().uuid(), count: z.number().int().min(0).max(10_000_000) }).strict(),
  z.object({ type: z.literal('error'), id: z.string().uuid(), code: z.literal('WORKER_INVALID_INPUT') }).strict()
])
export type JobState = {
  id: string; limit: number; progress: number;
  state: 'running' | 'completed' | 'cancelled' | 'timed-out' | 'crashed'
  count: number | null
}

// Sieve processes bounded chunks, yielding so cancellation/IPC is not starved.
export async function countPrimes(limit: number, progress: (value: number) => void,
  yieldTurn: () => Promise<void> = () => new Promise(resolve => setImmediate(resolve))) {
  jobInput.parse({ limit })
  const composite = new Uint8Array(limit + 1)
  let count = 0
  for (let n = 2; n <= limit; n++) {
    if (!composite[n]) {
      count++
      if (n * n <= limit) for (let multiple = n * n; multiple <= limit; multiple += n) composite[multiple] = 1
    }
    if (n % 50_000 === 0) { progress(Math.floor(n / limit * 100)); await yieldTurn() }
  }
  progress(100)
  return count
}
