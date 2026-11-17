import { countPrimes, workerRequest } from './protocol'

// This is an Electron utilityProcess entry, not a renderer or worker_thread.
const port = process.parentPort
if (!port) throw new Error('UTILITY_PROCESS_REQUIRED')
let accepted = false
port.on('message', async event => {
  if (accepted) return
  const request = workerRequest.safeParse(event.data)
  if (!request.success) return
  accepted = true
  const { id, limit } = request.data
  try {
    const count = await countPrimes(limit, progress => port.postMessage({ type: 'progress', id, progress }))
    port.postMessage({ type: 'result', id, count })
  } catch { port.postMessage({ type: 'error', id, code: 'WORKER_INVALID_INPUT' }) }
})
