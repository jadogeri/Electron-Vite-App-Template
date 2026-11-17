import { useEffect, useState } from 'react'
import type { FeatureBridge } from '../../../../shared/features'

type Status = { network: string; issue?: string | null; items: { id: string; payload: { title: string }; state: string; attempts: number }[] }
export const placement = 'tools' as const
export default function OfflineSync({ bridge }: { bridge: FeatureBridge }) {
  const [status, setStatus] = useState<Status>({ network: 'unknown', items: [] })
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    const off = bridge.on('offline-sync', 'status', payload => { if (active) setStatus(payload as Status) })
    const online = () => { void bridge.call('offline-sync', 'onlineHint', { online: navigator.onLine }).catch(() => { if (active) setError('Connectivity check failed.') }) }
    window.addEventListener('online', online); window.addEventListener('offline', online)
    void bridge.call<Status>('offline-sync', 'status').then(value => { if (active) setStatus(value) }).catch(() => { if (active) setError('Could not read the local sync queue.') })
    online()
    return () => { active = false; off(); window.removeEventListener('online', online); window.removeEventListener('offline', online) }
  }, [bridge])
  async function run(method: string, input?: unknown) {
    setBusy(true); setError('')
    try { await bridge.call('offline-sync', method, input); setStatus(await bridge.call<Status>('offline-sync', 'status')) }
    catch { setError('Sync operation failed. The local queue is preserved; check connectivity and storage.') }
    finally { setBusy(false) }
  }
  return <section aria-label="Offline synchronization"><h2>Offline sync</h2>
    <p role="status">Backend: {status.network}. Pending operations: {status.items.length}.</p>
    {status.issue && <p role="alert">{status.issue}</p>}
    {status.network === 'not-configured' && <p>No backend configured. Operations stay on this device. Configure APP_SYNC_BASE_URL in the main-process environment to enable delivery.</p>}
    <p>This starter queue is unencrypted. Do not enter credentials or sensitive information.</p>
    {error && <p role="alert">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); void run('enqueue', { title, text }) }}>
      <label>Operation title <input required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Text <textarea maxLength={4096} value={text} onChange={event => setText(event.target.value)} /></label>
      <button disabled={busy || !title.trim()}>Queue operation</button>
    </form>
    <button disabled={busy || status.network === 'not-configured'} onClick={() => { void run('drain') }}>Verify backend and sync</button>
    <ul>{status.items.map(item => <li key={item.id}>{item.payload.title}: {item.state} ({item.attempts}/5 attempts)
      {(item.state === 'conflict' || item.state === 'failed') && <>
        <p>{item.state === 'conflict' ? 'Server rejected conflicting changes. Resolve the server-side conflict before retrying the same operation.' : 'Delivery stopped. Check the backend before retrying.'}</p>
        <button disabled={busy} onClick={() => { void run('resolve', { id: item.id, action: 'retry' }) }}>Retry {item.payload.title}</button>
        <button disabled={busy} onClick={() => { void run('resolve', { id: item.id, action: 'discard' }) }}>Discard {item.payload.title}</button>
      </>}
    </li>)}</ul>
  </section>
}
