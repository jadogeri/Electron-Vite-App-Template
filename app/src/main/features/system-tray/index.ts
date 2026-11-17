import { app, BrowserWindow, Menu, nativeImage, Notification, Tray } from 'electron'
import Store from 'electron-store'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { colorPNG, templatePNG } from './icons'
import { deliverNotification, trayLifecycle } from './lifecycle'
import { notificationSchema, preferencesSchema } from './validation'

export default function systemTray(context: FeatureContext): MainFeature {
  const store = new Store({ name: 'feature-system-tray', clearInvalidConfig: true })
  const parsed = preferencesSchema.safeParse(store.get('preferences'))
  let preferences = parsed.success ? parsed.data : { background: false, notifications: false }
  let tray: Tray | null = null
  const lifecycle = trayLifecycle()
  const removers = new Map<BrowserWindow, () => void>()
  const activeNotifications = new Set<() => void>()
  let quitting = false
  const aliveWindow = () => context.windows().find(window => !window.isDestroyed())
  const restore = () => {
    const window = aliveWindow()
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }
  const canTryTray = () => process.platform !== 'linux' ||
    Boolean((process.env.DISPLAY || process.env.WAYLAND_DISPLAY) && process.env.DBUS_SESSION_BUS_ADDRESS)
  const available = () => Boolean(tray && !tray.isDestroyed())
  const snapshot = () => ({
    ...preferences, trayAvailable: available(), nativeNotificationsSupported: Notification.isSupported()
  })
  const updateTray = () => {
    if (!preferences.background || quitting) {
      if (tray && !tray.isDestroyed()) { tray.removeAllListeners(); tray.destroy() }
      tray = null
    } else if (!available() && canTryTray()) {
      try {
        const icon = nativeImage.createFromDataURL(`data:image/png;base64,${process.platform === 'darwin' ? templatePNG : colorPNG}`)
        if (icon.isEmpty()) throw new Error('Tray icon unavailable')
        if (process.platform === 'darwin') icon.setTemplateImage(true)
        tray = new Tray(icon)
        tray.setToolTip('Workspace — running in background')
        tray.setContextMenu(Menu.buildFromTemplate([
          { label: 'Show workspace', click: restore },
          { label: 'Hide workspace', click: () => aliveWindow()?.hide() },
          { type: 'separator' },
          { label: 'Quit', click: () => { quitting = true; lifecycle.beforeQuit(); app.quit() } }
        ]))
        tray.on('double-click', restore)
        tray.on('click', restore)
      } catch {
        if (tray && !tray.isDestroyed()) tray.destroy()
        tray = null
      }
    }
    lifecycle.configure(preferences.background, available())
  }
  updateTray()
  const prepareQuit = () => { quitting = true; lifecycle.beforeQuit() }
  return {
    methods: {
      state: procedure(z.void(), snapshot),
      preferences: procedure(preferencesSchema, value => {
        // Store first, so a failed write cannot leave an unsaved background setting enabled.
        store.set('preferences', value)
        preferences = value
        updateTray()
        if (!value.background) restore()
        return snapshot()
      }),
      show: procedure(z.void(), () => { restore(); return true }),
      notify: procedure(notificationSchema, content => {
        if (activeNotifications.size >= 3) return { delivered: false, reason: 'busy' }
        let dispose = () => {}
        let finished = false
        let timer: ReturnType<typeof setTimeout> | undefined
        const result = deliverNotification({
          allowed: preferences.notifications, supported: Notification.isSupported(),
          create: () => new Notification({ ...content, silent: false }),
          restore,
          fallback: () => context.notify('toast', content),
          finished: () => {
            finished = true
            if (timer) clearTimeout(timer)
            activeNotifications.delete(dispose)
          }
        })
        dispose = () => { if (timer) clearTimeout(timer); result.cleanup(); activeNotifications.delete(dispose) }
        if (!finished) {
          activeNotifications.add(dispose)
          timer = setTimeout(dispose, 60_000)
          timer.unref()
        }
        return { delivered: true, native: result.native }
      })
    },
    attachWindow(window) {
      if (removers.has(window)) return
      const onClose = (event: Electron.Event) => {
        if (lifecycle.shouldHide() && available()) { event.preventDefault(); window.hide() }
      }
      const remove = () => { window.removeListener('close', onClose); removers.delete(window) }
      window.on('close', onClose)
      window.once('closed', remove)
      removers.set(window, () => { remove(); window.removeListener('closed', remove) })
    },
    keepAlive: () => lifecycle.keepAlive() && available(),
    beforeQuit: prepareQuit,
    shutdown() {
      prepareQuit()
      for (const remove of [...removers.values()]) remove()
      for (const dispose of [...activeNotifications]) dispose()
      updateTray()
    }
  }
}
