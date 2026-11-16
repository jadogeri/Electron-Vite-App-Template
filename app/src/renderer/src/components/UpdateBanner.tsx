import { useEffect, useState } from 'react'
import type { UpdateState } from '../../../shared/types'
import { updatePercent } from '../../../shared/validation'

interface UpdateBannerProps {
  update: UpdateState | null
  onInstall: () => Promise<void>
}

export function UpdateBanner({ update, onInstall }: UpdateBannerProps) {
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (update?.status !== 'installing') setInstalling(false)
    setError('')
  }, [update])
  if (!update || update.status === 'idle') return null
  const busy = installing || ['checking', 'available', 'downloading', 'installing'].includes(update.status)
  const percent = update.status === 'downloading' ? updatePercent(update.percent) : undefined
  const message = installing || update.status === 'installing' ? 'Restarting to install…'
    : update.status === 'checking' ? 'Checking for updates…'
    : update.status === 'available' ? `Version ${update.version} found. Preparing download…`
    : update.status === 'downloading' ? `Downloading update: ${percent}%`
    : update.status === 'downloaded' ? `Version ${update.version} is ready to install.`
    : update.status === 'not-available' ? 'You are up to date.'
    : update.status === 'not-configured' ? "Updates haven't been set up yet. No release has been published."
    : update.status === 'error' ? update.message : ''

  async function install() {
    if (installing) return
    setInstalling(true)
    setError('')
    try { await onInstall() }
    catch { setInstalling(false); setError('Unable to restart. Please try again.') }
  }

  return (
    <section className={`update-banner ${busy ? 'busy' : ''}`} aria-label="Application updates" aria-busy={busy}>
      {busy && <span className="spinner" aria-hidden="true" />}
      <div className="update-copy">
        <p role={update.status === 'error' ? 'alert' : 'status'}>{message}</p>
        {update.status === 'downloading' && <progress aria-label="Update download progress" value={percent} max={100} />}
        {(installing || update.status === 'installing') && <small>The app will close. Your operating system will finish the installation.</small>}
        {error && <p role="alert">{error}</p>}
      </div>
      {update.status === 'downloaded' && (
        <button disabled={installing} onClick={() => void install()}>
          {installing ? 'Restarting…' : 'Restart & Install'}
        </button>
      )}
    </section>
  )
}
