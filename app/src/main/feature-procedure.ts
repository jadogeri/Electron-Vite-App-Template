import type { IpcMainInvokeEvent } from 'electron'
import type { z } from 'zod'

export type FeatureProcedure = (input: unknown, event: IpcMainInvokeEvent) => unknown | Promise<unknown>
export function procedure<S extends z.ZodTypeAny>(
  schema: S, handler: (input: z.infer<S>, event: IpcMainInvokeEvent) => unknown | Promise<unknown>
): FeatureProcedure {
  return (input, event) => handler(schema.parse(input), event)
}

// Reject cycles, prototypes, undefined fields, excessive nesting and oversized data.
export function assertSafeData(value: unknown, maxBytes = 1024 * 1024): void {
  let nodes = 0
  let bytes = 0
  const seen = new Set<object>()
  function visit(item: unknown, depth: number): void {
    if (++nodes > 20000 || depth > 24) throw new Error('Invalid feature data')
    bytes += typeof item === 'string' ? Buffer.byteLength(item, 'utf8') : 8
    if (bytes > maxBytes) throw new Error('Feature data too large')
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return
    if (typeof item === 'number' && Number.isFinite(item)) return
    if (typeof item !== 'object' || seen.has(item)) throw new Error('Invalid feature data')
    seen.add(item)
    if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype) throw new Error('Invalid feature data')
    for (const [key, child] of Object.entries(item)) {
      bytes += Buffer.byteLength(key, 'utf8') + 4
      if (bytes > maxBytes) throw new Error('Feature data too large')
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid feature data')
      visit(child, depth + 1)
    }
    seen.delete(item)
  }
  if (value === undefined) return
  visit(value, 0)
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > maxBytes) throw new Error('Feature data too large')
}
