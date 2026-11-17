export function trayLifecycle() {
  let quitting = false
  let enabled = false
  let available = false
  return {
    configure(nextEnabled: boolean, nextAvailable: boolean) {
      enabled = nextEnabled; available = nextAvailable
    },
    shouldHide: () => !quitting && enabled && available,
    keepAlive: () => !quitting && enabled && available,
    beforeQuit: () => { quitting = true }
  }
}

export interface NotificationPort {
  once(event: 'click' | 'failed' | 'close', callback: () => void): unknown
  removeAllListeners(): unknown
  show(): void
  close(): void
}
/** Desktop permission denial is reported through `failed`; never assume support means permission. */
export function deliverNotification(options: {
  allowed: boolean
  supported: boolean
  create: () => NotificationPort
  restore: () => void
  fallback: () => void
  finished: () => void
}) {
  let notification: NotificationPort | undefined
  let fallbackSent = false
  let disposed = false
  const fallback = () => {
    if (fallbackSent || disposed) return
    fallbackSent = true
    options.fallback()
  }
  const cleanup = () => {
    if (disposed) return
    disposed = true
    notification?.removeAllListeners()
    notification?.close()
    options.finished()
  }
  if (!options.allowed || !options.supported) {
    fallback()
    cleanup()
    return { native: false, cleanup }
  }
  try {
    notification = options.create()
    notification.once('click', () => { options.restore(); cleanup() })
    notification.once('failed', () => { fallback(); cleanup() })
    notification.once('close', cleanup)
    notification.show()
    return { native: !fallbackSent, cleanup }
  } catch {
    fallback()
    cleanup()
    return { native: false, cleanup }
  }
}
