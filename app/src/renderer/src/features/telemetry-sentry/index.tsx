import { useEffect, useState } from 'react'
import type { FeatureBridge } from '../../../../shared/features'
export const placement = 'settings' as const
interface State { version: 1; enabled: boolean; configured: boolean }
export function reportRendererError(bridge: FeatureBridge, code: 'renderer-boundary' | 'renderer-unhandled'): void {
  void bridge.call('telemetry-sentry', 'reportRendererError', code).catch(() => {})
}
export default function Privacy({ bridge }: { bridge: FeatureBridge }) {
  const [state, setState] = useState<State>({ version: 1, enabled: false, configured: false })
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true; let received = false
    const off = bridge.on('telemetry-sentry', 'changed', value => { received = true; if (active) setState(value as State) })
    void bridge.call<State>('telemetry-sentry', 'getState').then(next => { if (active && !received) setState(next) })
      .catch(() => { if (active) setError(true) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false; off() }
  }, [bridge])
  async function change(enabled: boolean) {
    setBusy(true); setError(false)
    try { setState(await bridge.call<State>('telemetry-sentry', 'setConsent', { version: 1, enabled })) }
    catch { setError(true) } finally { setBusy(false) }
  }
  return <section aria-labelledby="privacy-heading"><h2 id="privacy-heading">Optional crash reports</h2>
    <p>Off by default. With your permission, Sentry receives only a fixed error category and application release.
      No error text, files, paths, URLs, headers, user identifiers, breadcrumbs, screenshots, recordings, analytics, or native memory dumps are collected.</p>
    <label><input type="checkbox" checked={state.enabled} disabled={busy} onChange={e => { void change(e.target.checked) }} /> Allow anonymous error-category reports</label>
    <p>You can withdraw consent here at any time. Requests are aborted where possible; data already received by the provider cannot be recalled.</p>
    {!state.configured && <p>No reporting endpoint is configured. No reports will be sent.</p>}
    {error && <p role="alert">Unable to load or save the privacy preference. Reporting remains disabled if saving failed.</p>}
  </section>
}
