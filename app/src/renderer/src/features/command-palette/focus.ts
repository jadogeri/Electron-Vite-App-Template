export function localShortcut(event: {
  defaultPrevented: boolean; isComposing: boolean; repeat: boolean
  metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; key: string
}) {
  if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.shiftKey ||
      !(event.metaKey || event.ctrlKey)) return null
  if (event.key.toLowerCase() === 'k') return 'toggle'
  if (event.key === ',') return 'settings'
  return null
}

export function trapTab(container: HTMLElement, event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>) {
  if (event.key !== 'Tab') return
  const focusable = [...container.querySelectorAll<HTMLElement>(
    'button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'
  )].filter(element => !element.hidden && !element.closest('[hidden], [inert]') && element.getAttribute('aria-hidden') !== 'true')
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = container.ownerDocument.activeElement
  if (!first) { event.preventDefault(); container.focus(); return }
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault(); last.focus()
  } else if (!event.shiftKey && (active === last || !container.contains(active))) {
    event.preventDefault(); first.focus()
  }
}
