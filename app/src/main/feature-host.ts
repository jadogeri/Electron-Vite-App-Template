import { ipcMain, type BrowserWindow, type BrowserWindowConstructorOptions } from 'electron'
import { featureChannels, featureIds, type FeatureId } from '../shared/features'
import { assertTrustedSender } from './trust'
import { assertSafeData, type FeatureProcedure } from './feature-procedure'
export { procedure } from './feature-procedure'
export type { FeatureProcedure } from './feature-procedure'

export interface FeatureContext {
  notify(event: string, payload: unknown): void
  windows(): BrowserWindow[]
  refreshMenus(): void
}
export interface MainFeature {
  methods: Record<string, FeatureProcedure>
  windowOptions?: Partial<BrowserWindowConstructorOptions>
  attachWindow?(window: BrowserWindow): void
  keepAlive?(): boolean
  onProtocol?(url: string): void | Promise<void>
  beforeQuit?(): void
  shutdown?(): void | Promise<void>
}
type Factory = (context: FeatureContext) => MainFeature | Promise<MainFeature>
const modules = import.meta.glob<{ default: Factory }>('./features/*/index.ts', { eager: true })
const plugins = new Map<FeatureId, MainFeature>()
const mainWindows = new Set<BrowserWindow>()
export const getMainWindows = (): BrowserWindow[] => [...mainWindows].filter(w => !w.isDestroyed())
export function trackMainWindow(window: BrowserWindow): void {
  mainWindows.add(window)
  window.once('closed', () => mainWindows.delete(window))
}
const namePattern = /^[a-zA-Z][a-zA-Z0-9:._-]{0,79}$/
let refreshMenus = () => {}
let quitting = false
let shutdownPromise: Promise<void> | undefined
export function setMenuRefresher(fn: () => void): void { refreshMenus = fn }
export async function setupFeatures(): Promise<void> {
  for (const id of featureIds) {
    const module = modules[`./features/${id}/index.ts`]
    if (!module) continue
    const plugin = await module.default({
      windows: getMainWindows,
      refreshMenus: () => refreshMenus(),
      notify: (event, payload) => {
        if (!namePattern.test(event)) throw new Error('Invalid feature event')
        assertSafeData(payload)
        for (const window of getMainWindows()) {
          try { if (!window.webContents.isDestroyed()) window.webContents.send(featureChannels.event, id, event, payload) } catch {}
        }
      }
    })
    if (!plugin || !plugin.methods || Object.keys(plugin.methods).some(key => !namePattern.test(key))) {
      throw new Error(`Invalid feature registration: ${id}`)
    }
    plugins.set(id, plugin)
  }
  const trustedMain = (event: Electron.IpcMainInvokeEvent) => {
    assertTrustedSender(event)
    if (!getMainWindows().some(window => window.webContents === event.sender)) throw new Error('Untrusted feature sender')
  }
  ipcMain.handle(featureChannels.list, event => { trustedMain(event); return [...plugins.keys()] })
  ipcMain.handle(featureChannels.call, async (event, id: unknown, method: unknown, input: unknown) => {
    try {
      trustedMain(event)
      if (quitting) throw new Error()
      if (typeof id !== 'string' || id.length > 40 || typeof method !== 'string' || !namePattern.test(method)) throw new Error()
      const plugin = plugins.get(id as FeatureId)
      if (!plugin || !Object.hasOwn(plugin.methods, method)) throw new Error()
      assertSafeData(input)
      const result = await plugin.methods[method](input, event)
      assertSafeData(result)
      return result
    } catch { throw new Error('Feature request failed') }
  })
}
export function featureWindowOptions(): Partial<BrowserWindowConstructorOptions> {
  // Plugins cannot weaken isolation or replace preload through window options.
  const options: Partial<BrowserWindowConstructorOptions> = {}
  for (const plugin of plugins.values()) {
    const { webPreferences: _ignored, ...safe } = plugin.windowOptions || {}
    Object.assign(options, safe)
  }
  return options
}
export function attachFeatures(window: BrowserWindow): void {
  trackMainWindow(window)
  for (const plugin of plugins.values()) plugin.attachWindow?.(window)
}
export const featuresKeepAlive = (): boolean => !quitting && [...plugins.values()].some(p => p.keepAlive?.())
export function prepareFeatureQuit(): void {
  if (quitting) return
  quitting = true
  for (const plugin of plugins.values()) {
    try { plugin.beforeQuit?.() } catch { /* Continue cleanup for remaining plugins. */ }
  }
}
export function shutdownFeatures(): Promise<void> {
  prepareFeatureQuit()
  return shutdownPromise ||= Promise.allSettled([...plugins.values()].map(p => Promise.resolve().then(() => p.shutdown?.()))).then(() => {})
}
export async function dispatchProtocol(url: string): Promise<void> {
  for (const plugin of plugins.values()) await plugin.onProtocol?.(url)
}
