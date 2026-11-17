import { useEffect, useState } from 'react'
import type { FeatureBridge } from '../../../../shared/features'

export const placement = 'settings' as const
type Status = {
  configured: boolean
  state: 'disabled' | 'signed-out' | 'signing-in' | 'signed-in'
  error?: string
  expiresAt?: number
}
const messages: Record<string, string> = {
  configuration: 'Authentication configuration is invalid. Contact the app administrator.',
  storage: 'Secure credential storage is unavailable. Sign-in is blocked until it is available. If signing out failed to clear storage, retry sign-out.',
  provider: 'The identity provider could not complete the request. You can retry. After sign-out, local credentials are removed unless a storage warning is shown; remote sessions may remain active.',
  expired: 'The sign-in attempt or session expired. Sign in again.'
}
function isStatus(value: unknown): value is Status {
  if (!value || typeof value !== 'object') return false
  const status = value as Status
  return typeof status.configured === 'boolean' &&
    ['disabled', 'signed-out', 'signing-in', 'signed-in'].includes(status.state) &&
    (status.error === undefined || (typeof status.error === 'string' && status.error in messages)) &&
    (status.expiresAt === undefined || (typeof status.expiresAt === 'number' && Number.isFinite(status.expiresAt)))
}
export default function AuthSecurity({ bridge }: { bridge: FeatureBridge }) {
  const [status, setStatus] = useState<Status>()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let mounted = true
    let receivedEvent = false
    const unsubscribe = bridge.on('auth-security', 'status', value => {
      if (mounted && isStatus(value)) { receivedEvent = true; setStatus(value) }
    })
    bridge.call<Status>('auth-security', 'status').then(value => {
      if (mounted && !receivedEvent && isStatus(value)) setStatus(value)
    }).catch(() => { if (mounted) setFailed(true) })
    return () => { mounted = false; unsubscribe() }
  }, [bridge])
  async function action(method: 'signIn' | 'cancel' | 'signOut') {
    setBusy(true)
    setFailed(false)
    try {
      const result = await bridge.call<Status>('auth-security', method)
      if (isStatus(result)) setStatus(result)
      else setFailed(true)
    } catch { setFailed(true) } finally { setBusy(false) }
  }
  return <section aria-labelledby="auth-heading" className="space-y-3 rounded border p-4">
    <h2 id="auth-heading" className="text-lg font-semibold">Account security</h2>
    <p aria-live="polite" role="status">
      {!status ? 'Loading account status…' :
        status.state === 'disabled' ? 'Sign-in is not configured for this app.' :
        status.state === 'signing-in' ? 'Complete sign-in in your system browser.' :
        status.state === 'signed-in' ? 'Signed in. Credentials are protected by the operating system.' : 'Signed out.'}
    </p>
    {status?.expiresAt && <p>Session expires: {new Date(status.expiresAt).toLocaleString()}</p>}
    {status?.error && <p role="alert">{messages[status.error]}</p>}
    {failed && <p role="alert">Account action failed. Try again.</p>}
    {status?.configured && <div className="flex gap-3">
      {status.state === 'signed-out' && <button type="button" disabled={busy} onClick={() => void action('signIn')}>Sign in with browser</button>}
      {status.state === 'signing-in' && <button type="button" onClick={() => void action('cancel')}>Cancel sign-in</button>}
      {(status.state === 'signed-in' || status.error === 'storage') &&
        <button type="button" disabled={busy} onClick={() => void action('signOut')}>Sign out and clear credentials</button>}
    </div>}
    <p className="text-sm">Passwords and tokens never appear here. This app uses a public-client authorization-code flow with PKCE.</p>
  </section>
}
