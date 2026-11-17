import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslate } from '../localization'

const ToastContext = createContext<(message: string) => void>(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslate()
  const [message, setMessage] = useState('')
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = useCallback((text: string) => {
    if (timeout.current) clearTimeout(timeout.current)
    setMessage(text)
    timeout.current = setTimeout(() => setMessage(''), 4500)
  }, [])
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current) }, [])
  return <ToastContext.Provider value={show}>
    {children}
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {message && <div className="toast">{message}<button aria-label={t('Dismiss notification')} onClick={() => setMessage('')}>×</button></div>}
    </div>
  </ToastContext.Provider>
}
