import { useSyncExternalStore } from 'react'
type Values = Record<string, string | number>
type Translator = (key: string, values?: Values) => string
const fallback: Translator = (key, values) => key.replace(/\{\{(\w+)\}\}/g, (match, name) => String(values?.[name] ?? match))
let translator = fallback
const listeners = new Set<() => void>()
export function setTranslator(fn: Translator): void {
  translator = (key, values) => fn(key, values)
  listeners.forEach(listener => listener())
}
export function resetTranslator(): void { setTranslator(fallback) }
export function useTranslate(): Translator {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => translator)
}
