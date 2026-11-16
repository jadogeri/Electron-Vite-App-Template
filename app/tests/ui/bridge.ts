import type { Page } from '@playwright/test'
import type { UpdateState, DesktopAPI } from '../../src/shared/types'

declare global {
  interface Window {
    __test: {
      update: (state: UpdateState) => void
      toast: (message: string) => void
      command: (command: string) => void
      theme: (dark: boolean) => void
      release: () => void
      installs: number
      rejectInstall: boolean
    }
  }
}

export async function mockBridge(page: Page, options: { slow?: boolean; fail?: boolean; noBridge?: boolean } = {}) {
  await page.addInitScript(({ slow, fail, noBridge }) => {
    if (noBridge) return
    let resolve: () => void = () => {}
    const ready = slow ? new Promise<void>((done) => { resolve = done }) : Promise.resolve()
    const updates = new Set<(state: UpdateState) => void>()
    const toasts = new Set<(message: string) => void>()
    const commands = new Set<(command: string) => void>()
    const themes = new Set<(dark: boolean) => void>()
    const subscribe = <T>(set: Set<(value: T) => void>, callback: (value: T) => void) => {
      set.add(callback); return () => { set.delete(callback) }
    }
    let state: UpdateState = { status: 'idle' }
    window.__test = {
      update: (value) => { state = value; updates.forEach((fn) => fn(value)) },
      toast: (value) => toasts.forEach((fn) => fn(value)),
      command: (value) => commands.forEach((fn) => fn(value)),
      theme: (dark) => themes.forEach((fn) => fn(dark)),
      release: () => resolve(), installs: 0, rejectInstall: false
    }
    const api: DesktopAPI = {
      getAppVersion: async () => { await ready; if (fail) throw new Error('startup'); return '1.0.0' },
      getSettings: async () => ({ theme: (localStorage.getItem('theme') as 'dark' | 'light' | 'system') || 'system' }),
      setTheme: async (theme) => { localStorage.setItem('theme', theme); return { theme } },
      getUpdateState: async () => state,
      openFile: async () => ({ path: '/mock/notes.txt', name: 'notes.txt', text: 'test' }),
      saveFile: async () => true,
      onCommand: (fn) => subscribe(commands, fn),
      onToast: (fn) => subscribe(toasts, fn),
      onThemeChanged: (fn) => subscribe(themes, fn),
      onUpdateStatus: (fn) => subscribe(updates, fn),
      checkForUpdates: async () => window.__test.update({ status: 'not-available' }),
      installUpdate: async () => {
        window.__test.installs++
        if (window.__test.rejectInstall) throw new Error('installer rejected')
      }
    }
    window.api = api
  }, options)
}

export async function emitUpdate(page: Page, state: UpdateState) {
  await page.evaluate((value) => window.__test.update(value), state)
}
