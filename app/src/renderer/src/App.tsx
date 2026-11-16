import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import type { Settings, ThemePreference, UpdateState } from '../../shared/types'
import { UpdateBanner } from './components/UpdateBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider, useToast } from './components/Toast'
import './App.css'
import logo from '../../../resources/icon.png'

function Workspace() {
  const toast = useToast()
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(true)
  const [startupError, setStartupError] = useState(false)
  const [settings, setSettings] = useState<Settings>({ theme: 'system' })
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('Ready')
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })

  useEffect(() => {
    let active = true
    let updateReceived = false
    // Subscribe before requesting a snapshot to avoid losing startup events.
    const unsubUpdate = window.api.onUpdateStatus((value) => {
      updateReceived = true
      if (active) setUpdate(value)
    })
    const unsubCommand = window.api.onCommand((cmd) => {
      setStatus(`Menu command: ${cmd}`)
      if (cmd === 'open') void handleOpen()
    })
    const unsubToast = window.api.onToast(toast)
    Promise.all([window.api.getAppVersion(), window.api.getSettings(), window.api.getUpdateState()])
      .then(([appVersion, preferences, snapshot]) => {
        if (!active) return
        setVersion(appVersion)
        setSettings(preferences)
        if (!updateReceived) setUpdate(snapshot)
      })
      .catch(() => { if (active) setStartupError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; unsubUpdate(); unsubCommand(); unsubToast() }
  }, [toast])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (dark = media.matches) => {
      document.documentElement.dataset.theme =
        settings.theme === 'system' ? (dark ? 'dark' : 'light') : settings.theme
    }
    const onChange = () => apply()
    apply()
    media.addEventListener('change', onChange)
    const unsubscribe = window.api.onThemeChanged(apply)
    return () => { media.removeEventListener('change', onChange); unsubscribe() }
  }, [settings.theme])

  async function handleOpen() {
    try {
      const file = await window.api.openFile()
      if (file) setStatus(`Opened: ${file.name}`)
    } catch { toast('Unable to open the file') }
  }

  async function changeTheme(theme: ThemePreference) {
    try { setSettings(await window.api.setTheme(theme)); toast('Theme saved') }
    catch { toast('Unable to save the theme') }
  }

  if (loading) return (
    <main className="loading-screen" aria-busy="true" aria-label="Application loading">
      <span className="spinner" aria-hidden="true" />
      <h1>Preparing your workspace</h1>
      <p role="status">Loading settings and checking application state…</p>
      <div className="skeleton" aria-hidden="true" />
    </main>
  )
  if (startupError) return (
    <main className="loading-screen" role="alert">
      <h1>Unable to start</h1><p>Your settings could not be loaded.</p>
      <button onClick={() => window.location.reload()}>Try again</button>
    </main>
  )

  return (
    <div className="app-shell">
      <header>
        <img src={logo} alt="" width="36" height="36" />
        <strong>{import.meta.env.VITE_APP_TITLE || 'Electron Starter'}</strong>
        <span className="version">v{version}</span>
        <nav aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <UpdateBanner update={update} onInstall={() => window.api.installUpdate()} />
      <main className="workspace">
        <Routes>
          <Route path="/" element={<>
            <p className="eyebrow">DESKTOP APPLICATION TEMPLATE</p>
            <h1>Your next desktop app starts here.</h1>
            <p className="muted">A secure native foundation, with the flexibility to make it yours.</p>
            <div className="card mt-8">
              <h2>Try the essentials</h2>
              <p>Native dialogs, typed IPC, persistent themes, and automatic updates.</p>
              <div className="actions">
                <button onClick={() => setCount((value) => value + 1)}>Count is {count}</button>
                <button className="secondary" onClick={() => void handleOpen()}>Test Native Open Dialog</button>
                <button className="secondary" onClick={() => toast('Your app is ready to build')}>Show toast</button>
              </div>
              <p role="status">{status}</p>
            </div>
          </>} />
          <Route path="/dashboard" element={<>
            <h1>Dashboard</h1>
            <div className="card"><h2>Application health</h2><p>Version {version} · Secure preload bridge connected</p></div>
          </>} />
          <Route path="/settings" element={<>
            <h1>Settings</h1>
            <div className="card">
              <label htmlFor="theme">Appearance</label>
              <select id="theme" value={settings.theme} onChange={(event) => void changeTheme(event.target.value as ThemePreference)}>
                <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
              </select>
              <p className="muted">Saved locally. System mode follows your OS appearance.</p>
              <button onClick={() => { void window.api.checkForUpdates().catch(() => toast('Unable to check for updates')) }}>
                Check for updates
              </button>
            </div>
          </>} />
          <Route path="*" element={<><h1>Page not found</h1><NavLink to="/">Return home</NavLink></>} />
        </Routes>
      </main>
      <footer>Electron + Vite + React · Built for your next idea</footer>
    </div>
  )
}

export function App() {
  if (!window.api) return <main className="loading-screen"><h1>Desktop bridge unavailable</h1><p>Run npm run dev to open the Electron app. UI tests supply a mock bridge.</p></main>
  return <ErrorBoundary><ToastProvider><HashRouter><Workspace /></HashRouter></ToastProvider></ErrorBoundary>
}

export default App
