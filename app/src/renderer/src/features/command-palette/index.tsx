import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FeatureBridge } from '../../../../shared/features'
import { commands, filterCommands, type CommandId } from '../../../../main/features/command-palette/commands'
import { localShortcut, trapTab } from './focus'
import './style.css'

export const placement = 'global' as const
interface ShortcutState { enabled: boolean; registered: boolean; conflict: boolean }
export default function CommandPalette({ bridge }: { bridge: FeatureBridge }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [message, setMessage] = useState('')
  const [running, setRunning] = useState(false)
  const [shortcut, setShortcut] = useState<ShortcutState | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const filtered = filterCommands(query)
  const run = useCallback(async (id: CommandId) => {
    setRunning(true)
    try { await bridge.call('command-palette', 'run', id); setOpen(false) }
    catch { setMessage('Command unavailable. Please try again.') }
    finally { setRunning(false) }
  }, [bridge])
  useEffect(() => {
    let live = true
    const applyTheme = () => {
      void window.api.getSettings().then(settings => {
        if (live) {
          document.documentElement.dataset.theme = settings.theme === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            : settings.theme
          window.dispatchEvent(new CustomEvent('desktop:theme-changed', { detail: settings }))
        }
      }).catch(() => { if (live) setMessage('Appearance unavailable') })
    }
    const unTheme = window.api.onThemeChanged(applyTheme)
    const unExecute = bridge.on('command-palette', 'execute', payload => {
      const id = (payload as { id?: unknown })?.id
      if (!commands.some(command => command.id === id)) return
      if (id === 'home') navigate('/')
      if (id === 'dashboard') navigate('/dashboard')
      if (id === 'settings') navigate('/settings')
      if (typeof id === 'string' && id.startsWith('theme-')) applyTheme()
      setOpen(false)
    })
    const unOpen = bridge.on('command-palette', 'open', () => setOpen(true))
    const unError = bridge.on('command-palette', 'error', () => setMessage('Command unavailable. Please try again.'))
    const onKey = (event: KeyboardEvent) => {
      const action = localShortcut(event)
      if (!action) return
      event.preventDefault()
      if (action === 'toggle') setOpen(value => !value)
      else void run('settings')
    }
    document.addEventListener('keydown', onKey)
    void bridge.call<ShortcutState>('command-palette', 'state').then(value => {
      if (live) setShortcut(value)
    }).catch(() => { if (live) setMessage('Shortcut preferences unavailable') })
    return () => {
      live = false
      document.removeEventListener('keydown', onKey)
      unExecute(); unOpen(); unError(); unTheme()
    }
  }, [bridge, navigate, run])
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setQuery(''); setSelected(0)
    input.current?.focus()
    const focusGuard = (event: FocusEvent) => {
      if (dialog.current && !dialog.current.contains(event.target as Node)) input.current?.focus()
    }
    document.addEventListener('focusin', focusGuard)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('focusin', focusGuard)
      document.body.style.overflow = previousOverflow
      if (previousFocus.current?.isConnected) previousFocus.current.focus()
    }
  }, [open])
  return <>
    <div className="desktop-command-launcher">
      <button onClick={() => setOpen(true)} aria-haspopup="dialog">Commands <kbd>Ctrl/⌘ K</kbd></button>
      <details><summary>Keyboard shortcuts</summary>
        <p>Ctrl/⌘ K: commands. Ctrl/⌘ ,: Settings. These work only inside the app.</p>
        <label><input type="checkbox" checked={shortcut?.enabled ?? false} disabled={!shortcut}
          onChange={event => {
            void bridge.call<ShortcutState>('command-palette', 'globalShortcut', { enabled: event.target.checked })
              .then(setShortcut).catch(() => setMessage('Unable to save the global shortcut'))
          }} /> Enable cross-app Ctrl/⌘ Alt Space to open commands</label>
        {shortcut?.conflict && <p role="alert">Shortcut unavailable or used by another app. Disable and re-enable to retry.</p>}
      </details>
    </div>
    <p role="status">{message}</p>
    {open && <div className="desktop-command-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) setOpen(false)
    }}>
      <div ref={dialog} className="desktop-command-dialog" role="dialog" aria-modal="true" aria-labelledby="desktop-command-title"
        tabIndex={-1} onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
          trapTab(event.currentTarget, event)
        }}>
        <h2 id="desktop-command-title">Commands</h2>
        <label htmlFor="desktop-command-search">Find a command</label>
        <input ref={input} id="desktop-command-search" role="combobox" aria-autocomplete="list"
          aria-expanded="true" aria-controls="desktop-command-results"
          aria-activedescendant={filtered[selected] ? `desktop-command-${filtered[selected].id}` : undefined}
          autoComplete="off" maxLength={100} value={query}
          onChange={event => { setQuery(event.target.value); setSelected(0) }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setSelected(value => filtered.length ? (value + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length : 0)
            }
            if (event.key === 'Enter' && filtered[selected] && !running) { event.preventDefault(); void run(filtered[selected].id) }
          }} />
        <ul role="listbox" id="desktop-command-results" aria-label="Matching commands">
          {filtered.map((command, index) => <li key={command.id} id={`desktop-command-${command.id}`}
            role="option" aria-selected={selected === index} aria-disabled={running}
            onMouseEnter={() => setSelected(index)}
            onMouseDown={event => event.preventDefault()} onClick={() => { if (!running) void run(command.id) }}>
            {command.label}
          </li>)}
        </ul>
        {!filtered.length && <p role="status">No matching commands</p>}
        <p role="status">{running ? 'Running command…' : 'Use arrow keys and Enter to select.'}</p>
        <button onClick={() => setOpen(false)}>Close commands</button>
      </div>
    </div>}
  </>
}
