import { useEffect, useState } from 'react'
import type { UpdateState } from '../../../shared/types'
import { updatePercent } from '../../../shared/validation'
import { useTranslate } from '../localization'

interface UpdateBannerProps {
  update: UpdateState | null
  onInstall: () => Promise<void>
}

export function UpdateBanner({ update, onInstall }: UpdateBannerProps) {
  const t = useTranslate()
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (update?.status !== 'installing') setInstalling(false)
    setError('')
  }, [update])
  if (!update || update.status === 'idle') return null
  const busy = installing || ['checking', 'available', 'downloading', 'installing'].includes(update.status)
  const percent = update.status === 'downloading' ? updatePercent(update.percent) : undefined
  const message = installing || update.status === 'installing' ? t('Restarting to install…')
    : update.status === 'checking' ? t('Checking for updates…')
    : update.status === 'available' ? t('Version {{version}} found. Preparing download…', { version: update.version })
    : update.status === 'downloading' ? t('Downloading update: {{percent}}%', { percent: percent! })
    : update.status === 'downloaded' ? t('Version {{version}} is ready to install.', { version: update.version })
    : update.status === 'not-available' ? t('You are up to date.')
    : update.status === 'not-configured' ? t("Updates haven't been set up yet. No release has been published.")
    : update.status === 'error' ? t(update.message) : ''

  async function install() {
    if (installing) return
    setInstalling(true)
    setError('')
    try { await onInstall() }
    catch { setInstalling(false); setError('Unable to restart. Please try again.') }
  }

  return (
    <section className={`update-banner ${busy ? 'busy' : ''}`} aria-label={t('Application updates')} aria-busy={busy}>
      {busy && <span className="spinner" aria-hidden="true" />}
      <div className="update-copy">
        <p role={update.status === 'error' ? 'alert' : 'status'}>{message}</p>
        {update.status === 'downloading' && <progress aria-label={t('Update download progress')} value={percent} max={100} />}
        {(installing || update.status === 'installing') && <small>{t('The app will close. Your operating system will finish the installation.')}</small>}
        {error && <p role="alert">{t(error)}</p>}
      </div>
      {update.status === 'downloaded' && (
        <button disabled={installing} onClick={() => void install()}>
          {t(installing ? 'Restarting…' : 'Restart & Install')}
        </button>
      )}
    </section>
  )
}
