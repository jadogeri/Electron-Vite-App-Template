import { useCallback, useEffect, useState } from 'react'
import type { FeatureBridge } from '../../../../shared/features'

type Note = { id: string; title: string; body: string; createdAt: number; updatedAt: number }
export const placement = 'tools' as const
export default function Notes({ bridge }: { bridge: FeatureBridge }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try { setNotes(await bridge.call<Note[]>('sqlite-db', 'list', { limit: 100, offset: 0 })) }
    catch { setError('Could not open notes. Back up your local data folder before attempting database recovery.') }
  }, [bridge])
  useEffect(() => { void load() }, [load])
  async function save() {
    setBusy(true); setError('')
    try {
      await bridge.call('sqlite-db', editing ? 'update' : 'create', { title, body, ...(editing ? { id: editing } : {}) })
      setEditing(null); setTitle(''); setBody(''); await load()
    } catch { setError('Could not save the note. Check its length and available disk space.') }
    finally { setBusy(false) }
  }
  return <section aria-label="Local SQLite notes">
    <h2>Local notes</h2><p>Stored on this device. Showing the first 100 notes; no data is sent online.</p>
    {error && <p role="alert">{error}</p>}
    <form onSubmit={event => { event.preventDefault(); void save() }}>
      <label htmlFor="sqlite-note-title">Title</label>
      <input id="sqlite-note-title" value={title} maxLength={160} required onChange={e => setTitle(e.target.value)} />
      <label htmlFor="sqlite-note-body">Note</label>
      <textarea id="sqlite-note-body" value={body} maxLength={16384} onChange={e => setBody(e.target.value)} />
      <button disabled={busy || !title.trim()}>{editing ? 'Save changes' : 'Add note'}</button>
      {editing && <button type="button" onClick={() => { setEditing(null); setTitle(''); setBody('') }}>Cancel edit</button>}
    </form>
    <ul>{notes.map(note => <li key={note.id}><h3>{note.title}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{note.body}</p>
      <button disabled={busy} onClick={() => { setEditing(note.id); setTitle(note.title); setBody(note.body) }}>Edit {note.title}</button>
      <button disabled={busy} onClick={async () => {
        setBusy(true)
        try { await bridge.call('sqlite-db', 'remove', { id: note.id }); await load() }
        catch { setError('Could not delete the note.') } finally { setBusy(false) }
      }}>Delete {note.title}</button></li>)}</ul>
  </section>
}
