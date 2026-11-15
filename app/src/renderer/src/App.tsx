import { useEffect, useState } from 'react'
import type { UpdateState } from '../../shared/types'
import './App.css'
import logo from '../../../resources/icon.png'

export function App() {
  const [version, setVersion] = useState('...')
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('Ready')
  const [update, setUpdate] = useState<UpdateState | null>(null)

  useEffect(() => {
    window.api.getAppVersion().then(setVersion)
    const unsubscribeCmd = window.api.onCommand((cmd: string) => setStatus(`Menu command: ${cmd}`))
    const unsubscribeUpdate = window.api.onUpdateStatus(setUpdate)

    return () => {
      unsubscribeCmd()
      unsubscribeUpdate()
    }
  }, [])

  const handleOpen = async () => {
    const file = await window.api.openFile()
    if (file) setStatus(`Opened: ${file.name}`)
  }

  return (
    <main className="starter">
      {update?.status === 'downloading' && (
        <div className="update-banner">
          <span>Downloading update: {update.percent}%</span>
          <progress value={update.percent} max={100} />
        </div>
      )}

      {update?.status === 'downloaded' && (
        <div className="update-banner ready">
          <span>Version {update.version} is ready to install.</span>
          <button onClick={() => window.api.installUpdate()}>Restart &amp; Install</button>
        </div>
      )}

      <img src={logo} alt="App Logo" className="logo" />
      <h1>Electron + Vite + React</h1>
      <p className="version">Version {version}</p>

      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>Count is {count}</button>
        <button className="secondary" onClick={handleOpen}>
          Test Native Open Dialog
        </button>
      </div>

      <p className="status">{status}</p>
    </main>
  )
}

export default App
