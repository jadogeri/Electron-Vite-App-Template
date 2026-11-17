import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslate } from '../localization'

function ErrorScreen() {
  const t = useTranslate()
  return <main role="alert" className="loading-screen">
    <h1>{t('Something went wrong')}</h1>
    <p>{t('Your app could not display this screen. Reload to try again.')}</p>
    <button onClick={() => window.location.reload()}>{t('Reload application')}</button>
  </main>
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Do not log component props or potentially sensitive exception messages.
    console.error('Renderer error boundary activated')
    void window.features?.list().then(ids => {
      if (ids.includes('telemetry-sentry')) return window.features?.call('telemetry-sentry', 'reportRendererError', 'renderer-boundary')
    }).catch(() => {})
  }
  render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children
  }
}
