import { useEffect, useState } from 'react'
import './App.css'
import logo from '../../../resources/icon.png'  

export function App() {
  const [version, setVersion] = useState('...')
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('Ready')

  useEffect(() => {
    window.api.getAppVersion().then(setVersion)
    const unsubscribe = window.api.onCommand((cmd: string) => setStatus(`Menu command: ${cmd}`))
    return () => unsubscribe()
  }, [])

  const handleOpen = async () => {
    const file = await window.api.openFile()
    if (file) setStatus(`Opened: ${file.name}`)
  }

  return (
    <main className="starter">
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
