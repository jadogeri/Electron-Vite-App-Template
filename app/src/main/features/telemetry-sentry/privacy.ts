import { z } from 'zod'
export const POLICY_VERSION = 1
export const consentSchema = z.object({ version: z.literal(POLICY_VERSION), enabled: z.boolean() }).strict()
export const errorCodeSchema = z.enum(['renderer-boundary', 'renderer-unhandled', 'main-unhandled', 'renderer-crashed'])
export type ErrorCode = z.infer<typeof errorCodeSchema>
export interface Consent { version: 1; enabled: boolean }
export interface Reporter { capture(code: ErrorCode): void; stop(): Promise<void> }
export function readConsent(input: unknown): Consent {
  const parsed = consentSchema.safeParse(input)
  return parsed.success ? parsed.data : { version: POLICY_VERSION, enabled: false }
}
// Rebuild instead of regex-scrubbing: arbitrary exception messages, paths,
// headers, user IDs, breadcrumbs, URLs and source contexts cannot survive.
export function redactEvent(event: { tags?: Record<string, unknown> }, release: string) {
  const code = errorCodeSchema.safeParse(event.tags?.safeCode)
  if (!code.success) return null
  return {
    message: code.data, level: 'error' as const,
    release: /^[a-zA-Z0-9@.+_-]{1,100}$/.test(release) ? release : 'unknown',
    tags: { safeCode: code.data }
  }
}
export class ConsentGate {
  private generation = 0
  private reporter: Reporter | undefined
  private enabled = false
  constructor(private load: () => Promise<Reporter>) {}
  async setEnabled(enabled: boolean): Promise<void> {
    const generation = ++this.generation
    this.enabled = enabled
    const previous = this.reporter
    this.reporter = undefined
    await previous?.stop().catch(() => {})
    if (!enabled || generation !== this.generation) return
    try {
      const reporter = await this.load()
      if (!this.enabled || generation !== this.generation) await reporter.stop().catch(() => {})
      else this.reporter = reporter
    } catch { /* Provider failure never disables local diagnostics or startup. */ }
  }
  capture(code: ErrorCode): void { if (this.enabled) { try { this.reporter?.capture(code) } catch {} } }
}
