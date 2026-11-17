import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import type { Settings, ThemePreference, UpdateState } from '../../shared/types'
import { UpdateBanner } from './components/UpdateBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider, useToast } from './components/Toast'
import './App.css'
import logo from '../../../resources/icon.png'
import { FeatureSlot, useRegisteredFeatures } from './FeatureHost'
import { useTranslate } from './localization'

function Workspace() {
  const t = useTranslate()
  const featureIds = useRegisteredFeatures()
  const toast = useToast()
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(true)
  const [startupError, setStartupError] = useState(false)
  const [settings, setSettings] = useState<Settings>({ theme: 'system' })
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState<{ key: string; values?: Record<string, string | number> }>({ key: 'Ready' })
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })
  useEffect(() => {
    const changed = (event: Event) => setSettings((event as CustomEvent<Settings>).detail)
    window.addEventListener('desktop:theme-changed', changed)
    return () => window.removeEventListener('desktop:theme-changed', changed)
  }, [])

  useEffect(() => {
    let active = true
    let updateReceived = false
    // Subscribe before requesting a snapshot to avoid losing startup events.
    const unsubUpdate = window.api.onUpdateStatus((value) => {
      updateReceived = true
      if (active) setUpdate(value)
    })
    const unsubCommand = window.api.onCommand((cmd) => {
      setStatus({ key: 'Menu command: {{command}}', values: { command: cmd } })
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
      if (file) setStatus({ key: 'Opened: {{name}}', values: { name: file.name } })
    } catch { toast(t('Unable to open the file')) }
  }

  async function changeTheme(theme: ThemePreference) {
    try { setSettings(await window.api.setTheme(theme)); toast(t('Theme saved')) }
    catch { toast(t('Unable to save the theme')) }
  }

  if (loading) return (
    <main className="loading-screen" aria-busy="true" aria-label={t('Application loading')}>
      <span className="spinner" aria-hidden="true" />
      <h1>{t('Preparing your workspace')}</h1>
      <p role="status">{t('Loading settings and checking application state…')}</p>
      <div className="skeleton" aria-hidden="true" />
    </main>
  )
  if (startupError) return (
    <main className="loading-screen" role="alert">
      <h1>{t('Unable to start')}</h1><p>{t('Your settings could not be loaded.')}</p>
      <button onClick={() => window.location.reload()}>{t('Try again')}</button>
    </main>
  )

  return (
    <div className="app-shell">
      <FeatureSlot placement="titlebar" ids={featureIds} />
      <FeatureSlot placement="global" ids={featureIds} />
      <header>
        <img src={logo} alt="" width="36" height="36" />
        <strong>{import.meta.env.VITE_APP_TITLE || 'Electron Starter'}</strong>
        <span className="version">v{version}</span>
        <nav aria-label={t('Main navigation')}>
          <NavLink to="/">{t('Home')}</NavLink>
          <NavLink to="/dashboard">{t('Dashboard')}</NavLink>
          <NavLink to="/settings">{t('Settings')}</NavLink>
          {featureIds.length > 0 && <NavLink to="/features">{t('Features')}</NavLink>}
        </nav>
      </header>
      <UpdateBanner update={update} onInstall={() => window.api.installUpdate()} />
      <main className="workspace">
        <Routes>
          <Route path="/" element={<>
            <p className="eyebrow">{t('DESKTOP APPLICATION TEMPLATE')}</p>
            <h1>{t('Your next desktop app starts here.')}</h1>
            <p className="muted">{t('A secure native foundation, with the flexibility to make it yours.')}</p>
            <div className="card mt-8">
              <h2>{t('Try the essentials')}</h2>
              <p>{t('Native dialogs, typed IPC, persistent themes, and automatic updates.')}</p>
              <div className="actions">
                <button onClick={() => setCount((value) => value + 1)}>{t('Count is {{count}}', { count })}</button>
                <button className="secondary" onClick={() => void handleOpen()}>{t('Test Native Open Dialog')}</button>
                <button className="secondary" onClick={() => toast(t('Your app is ready to build'))}>{t('Show toast')}</button>
              </div>
              <p role="status">{t(status.key, status.values)}</p>
            </div>
          </>} />
          <Route path="/dashboard" element={<>
            <h1>{t('Dashboard')}</h1>
            <div className="card"><h2>{t('Application health')}</h2><p>{t('Version {{version}} · Secure preload bridge connected', { version })}</p></div>
          </>} />
          <Route path="/settings" element={<>
            <h1>{t('Settings')}</h1>
            <div className="card">
              <label htmlFor="theme">{t('Appearance')}</label>
              <select id="theme" value={settings.theme} onChange={(event) => void changeTheme(event.target.value as ThemePreference)}>
                <option value="system">{t('System')}</option><option value="light">{t('Light')}</option><option value="dark">{t('Dark')}</option>
              </select>
              <p className="muted">{t('Saved locally. System mode follows your OS appearance.')}</p>
              <button onClick={() => { void window.api.checkForUpdates().catch(() => toast(t('Unable to check for updates'))) }}>
                {t('Check for updates')}
              </button>
            </div>
            <FeatureSlot placement="settings" ids={featureIds} />
          </>} />
          <Route path="/features" element={<><h1>{t('Features')}</h1><FeatureSlot placement="tools" ids={featureIds} /></>} />
          <Route path="*" element={<><h1>{t('Page not found')}</h1><NavLink to="/">{t('Return home')}</NavLink></>} />
        </Routes>
      </main>
      <footer>{t('Electron + Vite + React · Built for your next idea')}</footer>
    </div>
  )
}

export function App() {
  const t = useTranslate()
  if (!window.api) return <main className="loading-screen"><h1>{t('Desktop bridge unavailable')}</h1><p>{t('Run npm run dev to open the Electron app. UI tests supply a mock bridge.')}</p></main>
  return <ErrorBoundary><ToastProvider><HashRouter><Workspace /></HashRouter></ToastProvider></ErrorBoundary>
}

export default App
