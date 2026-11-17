import { useEffect, useState } from 'react'
import type { FeatureBridge } from '../../../../shared/features'

export const placement = 'global' as const
interface TrayState {
  background: boolean; notifications: boolean; trayAvailable: boolean; nativeNotificationsSupported: boolean
}
export default function SystemTray({ bridge }: { bridge: FeatureBridge }) {
  const [state, setState] = useState<TrayState | null>(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  useEffect(() => {
    let active = true
    const unsubscribe = bridge.on('system-tray', 'toast', payload => {
      const value = payload as { title?: unknown; body?: unknown }
      if (active && typeof value?.title === 'string' && typeof value?.body === 'string') {
        setMessage(`${value.title}: ${value.body}`)
      }
    })
    void bridge.call<TrayState>('system-tray', 'state').then(value => {
      if (active) setState(value)
    }).catch(() => { if (active) setMessage('Background preferences unavailable') })
    return () => { active = false; unsubscribe() }
  }, [bridge])
  const save = (change: Partial<TrayState>) => {
    if (!state) return
    setPending(true)
    void bridge.call<TrayState>('system-tray', 'preferences', {
      background: change.background ?? state.background,
      notifications: change.notifications ?? state.notifications
    }).then(value => {
      setState(value)
      setMessage(value.background && !value.trayAvailable
        ? 'System tray is unavailable here. Closing the window will not hide it.'
        : 'Background preferences saved.')
    }).catch(() => setMessage('Unable to save background preferences')).finally(() => setPending(false))
  }
  return <aside aria-label="Background and notifications">
    <details><summary>Background and notifications</summary>
      <label><input type="checkbox" disabled={!state || pending} checked={state?.background ?? false}
        onChange={event => save({ background: event.target.checked })} /> Run in the background when closing</label>
      <p>Closing hides only if a tray was created. Use Quit to exit completely.</p>
      <label><input type="checkbox" disabled={!state || pending} checked={state?.notifications ?? false}
        onChange={event => save({ notifications: event.target.checked })} /> Allow native desktop notifications</label>
      <p>OS settings may block notifications; unavailable or failed delivery uses an in-app message.</p>
      <button onClick={() => {
        void bridge.call('system-tray', 'notify', { title: 'Workspace', body: 'Your notification test is ready.' })
          .then((value: unknown) => {
            const result = value as { native?: boolean; delivered?: boolean }
            if (!result.delivered) setMessage('Please wait before sending another notification.')
            else if (result.native) setMessage('Notification submitted to your operating system.')
          }).catch(() => setMessage('Unable to send the test notification'))
      }}>Test notification</button>
    </details>
    <p role="status" aria-live="polite">{message}</p>
    {message && <button aria-label="Dismiss background notification" onClick={() => setMessage('')}>Dismiss</button>}
  </aside>
}
