import { useEffect, useState } from 'react'
import type { FeatureBridge } from '../../../../shared/features'

type Job = { id: string; limit: number; progress: number; state: string; count: number | null }
export const placement = 'tools' as const
export default function Workers({ bridge }: { bridge: FeatureBridge }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [limit, setLimit] = useState(1_000_000)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    const off = bridge.on('worker-process', 'job', payload => {
      if (!active) return
      const job = payload as Job
      setJobs(old => [job, ...old.filter(item => item.id !== job.id)].slice(0, 52))
    })
    void bridge.call<Job[]>('worker-process', 'status').then(value => { if (active) setJobs(value) }).catch(() => { if (active) setError('Could not read background jobs.') })
    return () => { active = false; off() }
  }, [bridge])
  async function run(method: string, input: unknown) {
    setError(''); setBusy(true)
    try { await bridge.call('worker-process', method, input) }
    catch { setError('Could not run background work. At most two jobs may run; check the bundled worker entry.') }
    finally { setBusy(false) }
  }
  return <section aria-label="Background CPU jobs"><h2>Background prime counter</h2>
    <p>Uses a separate Electron utility process. Two jobs maximum; each has a 15-second deadline and 64 MB JavaScript heap limit.</p>
    {error && <p role="alert">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); void run('start', { limit }) }}>
      <label>Count primes up to <input type="number" min={1000} max={10000000} step={1} required value={limit} onChange={event => setLimit(Number(event.target.value))} /></label>
      <button disabled={busy || jobs.filter(job => job.state === 'running').length >= 2}>Start job</button>
    </form>
    <ul>{jobs.map(job => <li key={job.id}>
      <span>Primes up to {job.limit}: {job.state}{job.count !== null ? `, ${job.count} primes` : ''}</span>
      <progress aria-label={`Progress counting primes up to ${job.limit}`} value={job.progress} max={100} />
      {job.state === 'running' && <button onClick={() => { void run('cancel', { id: job.id }) }}>Cancel job up to {job.limit}</button>}
    </li>)}</ul>
  </section>
}
