import { useEffect, useState } from 'react'
import type { FeatureBridge } from '../../../../shared/features'
export const placement = 'settings' as const
interface State { channel: 'latest' | 'beta' | 'alpha'; prereleaseConsent: boolean }
export default function UpdateChannel({ bridge }: { bridge: FeatureBridge }) {
  const [state, setState] = useState<State>({ channel: 'latest', prereleaseConsent: false })
  const [draft, setDraft] = useState<State>(state)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true; let received = false
    const apply = (value: State) => { if (active) { setState(value); setDraft(value) } }
    const off = bridge.on('code-signing', 'changed', value => { received = true; apply(value as State) })
    void bridge.call<State>('code-signing', 'getState').then(value => { if (!received) apply(value) })
      .catch(() => { if (active) setError(true) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false; off() }
  }, [bridge])
  async function save() {
    setBusy(true); setError(false)
    try { const next = await bridge.call<State>('code-signing', 'setChannel', draft); setState(next); setDraft(next) }
    catch { setError(true) } finally { setBusy(false) }
  }
  return <section aria-labelledby="channel-heading"><h2 id="channel-heading">Update channel</h2>
    <p>Current channel: {state.channel}. Returning to stable never installs an older version; wait for a newer stable release.</p>
    <label htmlFor="release-channel">Release channel</label>
    <select id="release-channel" value={draft.channel} disabled={busy} onChange={e => setDraft({ ...draft, channel: e.target.value as State['channel'] })}>
      <option value="latest">Stable</option><option value="beta">Beta</option><option value="alpha">Alpha</option>
    </select>
    <label><input type="checkbox" checked={draft.prereleaseConsent} disabled={busy} onChange={e => setDraft({ ...draft, prereleaseConsent: e.target.checked })} />I accept potentially unstable prerelease versions</label>
    <button disabled={busy || (draft.channel !== 'latest' && !draft.prereleaseConsent)} onClick={() => { void save() }}>Save update channel</button>
    {error && <p role="alert">Unable to change channel. Wait until checking, download or installation finishes, then retry.</p>}
  </section>
}
