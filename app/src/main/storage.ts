import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { join } from 'node:path'

const queues = new Map<string, Promise<void>>()

export async function readJsonStore<T>(
  directory: string,
  fileName: string,
  fallback: T
): Promise<T> {
  try {
    const raw = await readFile(join(directory, fileName), 'utf8')
    return { ...fallback, ...JSON.parse(raw) }
  } catch {
    return structuredClone(fallback)
  }
}

export function updateJsonStore<T>(
  directory: string,
  fileName: string,
  fallback: T,
  update: (store: T) => void
): Promise<void> {
  const filePath = join(directory, fileName)
  const tempPath = `${filePath}.tmp`
  const previous = queues.get(filePath) ?? Promise.resolve()

  const next = previous.then(async () => {
    const store = await readJsonStore(directory, fileName, fallback)
    update(store)
    await mkdir(directory, { recursive: true })
    await writeFile(tempPath, JSON.stringify(store, null, 2), { mode: 0o600 })
    await rename(tempPath, filePath)
  })

  queues.set(
    filePath,
    next.catch(() => {})
  )
  return next
}
