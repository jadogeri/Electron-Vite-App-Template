export const featureIds = ['frameless-window', 'system-tray', 'command-palette', 'sqlite-db', 'offline-sync', 'worker-process', 'auth-security', 'i18n', 'telemetry-sentry', 'code-signing'] as const
export type FeatureId = typeof featureIds[number]
export const featureChannels = { call: 'features:call', event: 'features:event', list: 'features:list' } as const
export interface FeatureBridge {
  call<T = unknown>(feature: FeatureId, method: string, input?: unknown): Promise<T>
  on(feature: FeatureId, event: string, callback: (payload: unknown) => void): () => void
  list(): Promise<FeatureId[]>
}
