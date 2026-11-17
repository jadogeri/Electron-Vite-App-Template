import type { Page } from '@playwright/test'
import type { FeatureBridge, FeatureId } from '../../src/shared/features'
import { mockBridge } from './bridge'

export interface DesktopCall { feature: FeatureId; method: string; input: unknown }
declare global {
  interface Window {
    __desktopTest: {
      calls: DesktopCall[]
      listCalls: number
      selected: FeatureId[]
      emit(feature: FeatureId, event: string, payload: unknown): void
      listenerCounts(): Record<string, number>
      failNext(method: string): void
    }
  }
}

/** This replaces IPC only. Tests exercise the actual host and actual React plugins. */
export async function mockDesktopFeatures(page: Page, options: {
  selected?: FeatureId[]
  framelessEnabled?: boolean
  trayAvailable?: boolean
  shortcutConflict?: boolean
} = {}) {
  await mockBridge(page)
  await page.addInitScript(options => {
    const selected: FeatureId[] = options.selected ?? ['frameless-window', 'system-tray', 'command-palette']
    const listeners = new Map<string, Set<(payload: unknown) => void>>()
    const calls: DesktopCall[] = []
    let failMethod = ''
    const framelessEnabled = localStorage.getItem('desktop-frameless-next') === 'true' || !!options.framelessEnabled
    let nextFramelessEnabled = framelessEnabled
    let maximized = false
    let tray = {
      background: false, notifications: false,
      trayAvailable: !!options.trayAvailable, nativeNotificationsSupported: false
    }
    let shortcut = { enabled: false, registered: false, conflict: false }
    const emit = (feature: FeatureId, event: string, payload: unknown) => {
      for (const fn of listeners.get(`${feature}:${event}`) ?? []) fn(payload)
    }
    window.__desktopTest = {
      calls, listCalls: 0, selected, emit,
      listenerCounts: () => Object.fromEntries([...listeners].map(([key, value]) => [key, value.size])),
      failNext: method => { failMethod = method }
    }
    const bridge: FeatureBridge = {
      list: async () => { window.__desktopTest.listCalls++; return [...selected] },
      on: (feature, event, callback) => {
        const key = `${feature}:${event}`
        const callbacks = listeners.get(key) ?? new Set()
        callbacks.add(callback); listeners.set(key, callbacks)
        return () => { callbacks.delete(callback) }
      },
      call: async <T>(feature: FeatureId, method: string, input?: unknown): Promise<T> => {
        if (!selected.includes(feature)) throw new Error('Feature unavailable')
        calls.push({ feature, method, input: input ?? null })
        if (failMethod === `${feature}:${method}`) {
          failMethod = ''
          throw new Error('Feature request failed')
        }
        let result: unknown
        if (feature === 'frameless-window') {
          if (method === 'state') result = {
            enabled: framelessEnabled, nextStartEnabled: nextFramelessEnabled, platform: 'win32', maximized
          }
          else if (method === 'setEnabled') {
            nextFramelessEnabled = (input as { enabled: boolean }).enabled
            localStorage.setItem('desktop-frameless-next', String(nextFramelessEnabled))
            result = { restartRequired: nextFramelessEnabled !== framelessEnabled, nextStartEnabled: nextFramelessEnabled }
          } else if (method === 'control') {
            if (input === 'maximize') maximized = !maximized
            result = true
          }
        }
        if (feature === 'system-tray') {
          if (method === 'state') result = { ...tray }
          else if (method === 'preferences') {
            const preferences = input as { background: boolean; notifications: boolean }
            tray = { ...tray, ...preferences }
            result = { ...tray }
          } else if (method === 'notify') {
            emit('system-tray', 'toast', input)
            result = { delivered: true, native: false }
          }
        }
        if (feature === 'command-palette') {
          if (method === 'state') result = { ...shortcut }
          else if (method === 'globalShortcut') {
            const { enabled } = input as { enabled: boolean }
            shortcut = { enabled, registered: enabled && !options.shortcutConflict, conflict: enabled && !!options.shortcutConflict }
            result = { ...shortcut }
          } else if (method === 'run') {
            const id = input as string
            if (id.startsWith('theme-')) localStorage.setItem('theme', id.slice('theme-'.length))
            if (id === 'check-updates') await window.api.checkForUpdates()
            emit('command-palette', 'execute', { id })
            result = true
          } else if (method === 'contextMenu') result = true
        }
        if (result === undefined) throw new Error('Unknown feature method')
        return result as T
      }
    }
    Object.assign(window, { features: bridge })
  }, options)
}
