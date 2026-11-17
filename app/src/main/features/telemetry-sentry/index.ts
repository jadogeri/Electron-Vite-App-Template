import { app } from 'electron'
import Store from 'electron-store'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { ConsentGate, POLICY_VERSION, consentSchema, errorCodeSchema, readConsent } from './privacy'
import { createSentryReporter } from './provider'

export default function telemetry(context: FeatureContext): MainFeature {
  const store = new Store({ name: 'preferences' })
  let consent = readConsent(store.get('telemetryConsent'))
  const dsn = process.env.SENTRY_DSN
  const configured = Boolean(dsn && /^https:\/\/[^@/?#]+@[^/?#]+\/[0-9]+$/.test(dsn))
  const gate = new ConsentGate(() => createSentryReporter(dsn!, `electron-vite-app-template@${app.getVersion()}`, () => consent.enabled))
  const state = () => ({ ...consent, configured })
  if (consent.enabled && configured) void gate.setEnabled(true)
  const onCrash = () => gate.capture('renderer-crashed')
  const onUnhandled = () => gate.capture('main-unhandled')
  app.on('render-process-gone', onCrash)
  process.on('uncaughtExceptionMonitor', onUnhandled)
  return {
    methods: {
      getState: procedure(z.void(), state),
      setConsent: procedure(consentSchema, async next => {
        // Drop the in-memory gate even if persisting revocation fails.
        consent = { version: POLICY_VERSION, enabled: next.enabled }
        const stopping = gate.setEnabled(next.enabled && configured)
        try { store.set('telemetryConsent', consent) }
        catch { consent = { version: POLICY_VERSION, enabled: false }; await gate.setEnabled(false); throw new Error('Unable to save privacy preference') }
        await stopping
        context.notify('changed', state())
        return state()
      }),
      reportRendererError: procedure(errorCodeSchema.extract(['renderer-boundary', 'renderer-unhandled']), code => { gate.capture(code); return { accepted: consent.enabled && configured } })
    },
    async shutdown() {
      app.removeListener('render-process-gone', onCrash)
      process.removeListener('uncaughtExceptionMonitor', onUnhandled)
      consent = { version: POLICY_VERSION, enabled: false }
      await gate.setEnabled(false)
    }
  }
}
