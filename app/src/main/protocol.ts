export function boundedCallback(value: string): string | null {
  if (typeof value !== 'string' || value.length > 8192) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'electron-vite-template:' || url.hostname !== 'auth' ||
        url.pathname !== '/callback' || url.username || url.password || url.port || url.hash) return null
    return url.href
  } catch { return null }
}
