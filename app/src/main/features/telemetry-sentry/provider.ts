import type { Reporter } from './privacy'
import { redactEvent } from './privacy'

// Module itself has no Sentry runtime import. Loading it while disabled is inert.
export async function createSentryReporter(dsn: string, release: string, consent: () => boolean): Promise<Reporter> {
  const sdk = await import('@sentry/electron/main')
  if (!consent()) return { capture() {}, async stop() {} }
  let active = true
  const pending = new Set<AbortController>()
  sdk.init({
    dsn, release,
    defaultIntegrations: false, integrations: [],
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false, frameContextLines: 0 },
    sendClientReports: false, enableOpenTelemetrySetup: false,
    getSessions: () => [], ipcMode: 0 as typeof sdk.IPCMode.Classic,
    attachScreenshot: false, enableRendererProfiling: false,
    beforeSendLog: () => null, beforeSendMetric: () => null,
    tracesSampleRate: 0, sampleRate: 1, maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: event => {
      const clean = active && consent() ? redactEvent(event, release) : null
      return clean ? { ...clean, type: undefined } : null
    },
    beforeSendTransaction: () => null,
    transport: options => sdk.createTransport({ ...options, bufferSize: 1 }, async request => {
      if (!active || !consent()) return { statusCode: 200 }
      const abort = new AbortController()
      pending.add(abort)
      const timeout = setTimeout(() => abort.abort(), 5000)
      try {
        const response = await fetch(options.url, {
          method: 'POST', body: request.body as BodyInit, signal: abort.signal,
          credentials: 'omit', redirect: 'error', headers: { 'Content-Type': 'application/x-sentry-envelope' }
        })
        // Never retain or log the provider body.
        await response.body?.cancel()
        return { statusCode: response.status }
      } catch { return { statusCode: 503 } }
      finally { clearTimeout(timeout); pending.delete(abort) }
    })
  })
  return {
    capture(code) { if (active && consent()) sdk.captureEvent({ tags: { safeCode: code } }) },
    async stop() {
      active = false
      for (const abort of pending) abort.abort()
      pending.clear()
      // Zero timeout: do not deliberately flush queued reports on revocation.
      await sdk.close(0)
    }
  }
}
