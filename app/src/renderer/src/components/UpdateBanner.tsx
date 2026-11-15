import type { UpdateState } from '../../../shared/types'

interface UpdateBannerProps {
  update: UpdateState | null
  onInstall: () => void
}

export function UpdateBanner({ update, onInstall }: UpdateBannerProps) {
  if (!update) return null

  if (update.status === 'downloading') {
    return (
      <div className="update-banner">
        <span>Downloading update: {update.percent}%</span>
        <progress value={update.percent} max={100} />
      </div>
    )
  }

  if (update.status === 'downloaded') {
    return (
      <div className="update-banner ready">
        <span>Version {update.version} is ready to install.</span>
        <button onClick={onInstall}>Restart &amp; Install</button>
      </div>
    )
  }

  return null
}
