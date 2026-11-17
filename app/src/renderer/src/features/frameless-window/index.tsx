import { useEffect, useState } from 'react'
import type { FeatureBridge } from '../../../../shared/features'
import './style.css'

export const placement = 'titlebar' as const
interface WindowState { enabled: boolean; nextStartEnabled: boolean; platform: string; maximized: boolean }

export default function FramelessWindow({ bridge }: { bridge: FeatureBridge }) {
  const [state, setState] = useState<WindowState | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let live = true
    bridge.call<WindowState>('frameless-window', 'state').then(value => {
      if (live) setState(value)
    }).catch(() => { if (live) setMessage('Window preferences unavailable') })
    return () => { live = false }
  }, [bridge])
  const control = (action: 'minimize' | 'maximize' | 'close') => {
    void bridge.call('frameless-window', 'control', action).then(() => {
      if (action === 'maximize') return bridge.call<WindowState>('frameless-window', 'state').then(setState)
    }).catch(() => setMessage('Window action unavailable'))
  }
  return <section className={state?.enabled ? 'desktop-titlebar' : 'desktop-window-preference'} aria-label="Window preferences">
    {state?.enabled && <div className={`desktop-drag ${state.platform === 'darwin' ? 'desktop-traffic-lights' : ''}`}
      onDoubleClick={() => control('maximize')}>Workspace</div>}
    <details className="desktop-no-drag"><summary>Window style</summary>
      <label><input type="checkbox" checked={state?.nextStartEnabled ?? false} disabled={!state}
        onChange={event => {
          const enabled = event.target.checked
          void bridge.call<{ restartRequired: boolean }>('frameless-window', 'setEnabled', { enabled }).then(result => {
            setState(value => value ? { ...value, nextStartEnabled: enabled } : value)
            setMessage(result.restartRequired ? 'Window style saved. Quit and reopen to apply.' : 'Window style saved.')
          }).catch(() => setMessage('Unable to save window style'))
        }} /> Use custom title bar after restart</label>
      <p>Native window controls are used by default.</p>
    </details>
    {state?.enabled && state.platform !== 'darwin' && <div className="desktop-window-controls desktop-no-drag">
      <button aria-label="Minimize window" onClick={() => control('minimize')}>—</button>
      <button aria-label="Maximize or restore window" onClick={() => control('maximize')}>□</button>
      <button aria-label="Close window" onClick={() => control('close')}>×</button>
    </div>}
    <span className="desktop-no-drag" role="status">{message}</span>
  </section>
}
