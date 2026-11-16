import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Do not log component props or potentially sensitive exception messages.
    console.error('Renderer error boundary activated')
  }
  render() {
    return this.state.failed ? (
      <main role="alert" className="loading-screen">
        <h1>Something went wrong</h1>
        <p>Your app could not display this screen. Reload to try again.</p>
        <button onClick={() => window.location.reload()}>Reload application</button>
      </main>
    ) : this.props.children
  }
}
