import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

export const CALLBACK_URL = 'electron-vite-template://auth/callback'
export const ATTEMPT_TTL_MS = 5 * 60_000
export type SessionStatus = {
  configured: boolean
  state: 'disabled' | 'signed-out' | 'signing-in' | 'signed-in'
  error?: 'configuration' | 'storage' | 'provider' | 'callback' | 'expired'
  expiresAt?: number
}
export const credentialsSchema = z.object({
  accessToken: z.string().min(1).max(16_384),
  refreshToken: z.string().min(1).max(16_384).optional(),
  expiresAt: z.number().finite().positive()
}).strict()
export type Credentials = z.infer<typeof credentialsSchema>
export interface Vault {
  available(): boolean
  read(): Promise<Credentials | null>
  write(value: Credentials): Promise<void>
  clear(): Promise<void>
}
export interface Provider {
  readonly issuer?: string
  authorizationUrl(input: { state: string; nonce: string; challenge: string }): Promise<string>
  exchange(input: { code: string; verifier: string; nonce: string }): Promise<Credentials>
  revoke(value: Credentials): Promise<void>
}
type Attempt = { state: string; nonce: string; verifier: string; expires: number; generation: number }
export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}
const same = (a: string, b: string): boolean => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
export function parseCallback(raw: string): { state: string; code?: string; denied: boolean; issuer?: string } | null {
  if (raw.length > 8_192) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'electron-vite-template:' || url.hostname !== 'auth' ||
        url.pathname !== '/callback' || url.port || url.username || url.password || url.hash) return null
    // Only the authorization-code response mode is supported; never accept tokens in a URL.
    const allowed = new Set(['state', 'code', 'error', 'error_description', 'error_uri', 'iss', 'session_state'])
    for (const key of url.searchParams.keys()) {
      if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) return null
    }
    const state = url.searchParams.get('state')
    const code = url.searchParams.get('code')
    const denied = url.searchParams.has('error')
    if (!state || state.length > 128 || (Boolean(code) === denied) || (code && code.length > 4_096)) return null
    const issuer = url.searchParams.get('iss')
    return { state, code: code || undefined, denied, ...(issuer ? { issuer } : {}) }
  } catch { return null }
}

/** Owns all credentials. Public methods and notifications return only SessionStatus. */
export class AuthController {
  private pending?: Attempt
  private generation = 0
  private timer?: ReturnType<typeof setTimeout>
  private sessionTimer?: ReturnType<typeof setTimeout>
  private statusValue: SessionStatus
  // Serialize disk operations so cancellation/logout cannot race an in-flight token write.
  private disk: Promise<unknown> = Promise.resolve()
  private saved: Credentials | null = null
  constructor(
    private provider: Provider | null,
    private vault: Vault,
    private openBrowser: (url: string) => Promise<void>,
    private changed: (status: SessionStatus) => void,
    private now: () => number = Date.now
  ) {
    this.statusValue = { configured: !!provider, state: provider ? 'signed-out' : 'disabled' }
  }
  private io<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.disk.then(operation)
    this.disk = task.catch(() => undefined)
    return task
  }
  private set(status: SessionStatus): void {
    this.statusValue = status
    clearTimeout(this.sessionTimer)
    this.sessionTimer = undefined
    if (status.state === 'signed-in' && status.expiresAt !== undefined) {
      this.sessionTimer = setTimeout(() => this.expireSession(), Math.max(1, Math.min(status.expiresAt - this.now(), 2_147_000_000)))
      this.sessionTimer.unref?.()
    }
    this.changed(this.status())
  }
  private expireSession(): void {
    if (this.statusValue.state !== 'signed-in' || this.statusValue.expiresAt === undefined) return
    if (this.statusValue.expiresAt > this.now()) { this.set({ ...this.statusValue }); return }
    this.saved = null
    this.set({ configured: true, state: 'signed-out', error: 'expired' })
    void this.io(() => this.vault.clear()).catch(() => {
      this.set({ ...this.statusValue, error: 'storage' })
    })
  }
  status(): SessionStatus {
    if (this.statusValue.state === 'signed-in' && this.statusValue.expiresAt! <= this.now()) this.expireSession()
    return { ...this.statusValue }
  }
  private stopAttempt(): void {
    this.pending = undefined
    clearTimeout(this.timer)
    this.timer = undefined
  }
  async initialize(): Promise<void> {
    if (!this.provider) return
    try {
      if (!this.vault.available()) throw new Error('unavailable')
      this.saved = await this.io(() => this.vault.read())
      if (this.saved && this.saved.expiresAt > this.now()) {
        this.set({ configured: true, state: 'signed-in', expiresAt: this.saved.expiresAt })
      } else {
        this.saved = null
        await this.io(() => this.vault.clear())
      }
    } catch {
      this.saved = null
      this.set({ configured: true, state: 'signed-out', error: 'storage' })
    }
  }
  async signIn(): Promise<SessionStatus> {
    if (!this.provider || this.pending || this.statusValue.state === 'signing-in' ||
        this.statusValue.state === 'signed-in') return this.status()
    if (!this.vault.available()) {
      this.set({ configured: true, state: 'signed-out', error: 'storage' })
      return this.status()
    }
    const attempt: Attempt = {
      state: randomBytes(32).toString('base64url'), nonce: randomBytes(32).toString('base64url'),
      verifier: randomBytes(48).toString('base64url'), expires: this.now() + ATTEMPT_TTL_MS,
      generation: ++this.generation
    }
    this.pending = attempt
    this.set({ configured: true, state: 'signing-in' })
    this.timer = setTimeout(() => {
      if (attempt.generation === this.generation) {
        ++this.generation
        this.stopAttempt()
        this.set({ configured: true, state: 'signed-out', error: 'expired' })
      }
    }, ATTEMPT_TTL_MS)
    this.timer.unref?.()
    try {
      const url = await this.provider.authorizationUrl({
        state: attempt.state, nonce: attempt.nonce, challenge: pkceChallenge(attempt.verifier)
      })
      if (this.pending === attempt) await this.openBrowser(url)
    } catch {
      if (attempt.generation === this.generation) {
        this.stopAttempt()
        this.set({ configured: true, state: 'signed-out', error: 'provider' })
      }
    }
    return this.status()
  }
  cancel(): SessionStatus {
    if (this.statusValue.state !== 'signing-in') return this.status()
    ++this.generation
    this.stopAttempt()
    this.set({ configured: !!this.provider, state: this.provider ? 'signed-out' : 'disabled' })
    return this.status()
  }
  async onProtocol(raw: string): Promise<void> {
    const attempt = this.pending
    if (!attempt || !this.provider) return
    const parsed = parseCallback(raw)
    // Unrelated/malformed callbacks must not consume a valid pending attempt.
    if (!parsed || !same(parsed.state, attempt.state) ||
        (parsed.issuer !== undefined && parsed.issuer !== this.provider.issuer)) return
    this.stopAttempt() // Consume before first await: duplicate callbacks cannot exchange twice.
    if (this.now() >= attempt.expires || parsed.denied) {
      ++this.generation
      this.set({ configured: true, state: 'signed-out', error: parsed.denied ? 'provider' : 'expired' })
      return
    }
    let stage: 'provider' | 'storage' = 'provider'
    try {
      const credentials = credentialsSchema.parse(await this.provider.exchange({
        code: parsed.code!, verifier: attempt.verifier, nonce: attempt.nonce
      }))
      if (attempt.generation !== this.generation) {
        await this.provider.revoke(credentials).catch(() => undefined)
        return
      }
      if (credentials.expiresAt <= this.now()) throw new Error('expired')
      stage = 'storage'
      await this.io(async () => {
        if (attempt.generation !== this.generation) return
        await this.vault.write(credentials)
        if (attempt.generation !== this.generation) {
          await this.vault.clear()
          return
        }
        this.saved = credentials
        this.set({ configured: true, state: 'signed-in', expiresAt: credentials.expiresAt })
      })
    } catch {
      if (attempt.generation === this.generation) {
        this.saved = null
        this.set({ configured: true, state: 'signed-out', error: stage })
      }
    }
  }
  async signOut(): Promise<SessionStatus> {
    ++this.generation
    this.stopAttempt()
    const old = this.saved
    this.saved = null
    this.set({ configured: !!this.provider, state: this.provider ? 'signed-out' : 'disabled' })
    try { await this.io(() => this.vault.clear()) } catch {
      this.set({ ...this.statusValue, error: 'storage' })
    }
    if (old && this.provider) {
      try { await this.provider.revoke(old) } catch {
        // Local logout succeeds even when offline. Never reveal a provider response.
        if (!this.statusValue.error) this.set({ ...this.statusValue, error: 'provider' })
      }
    }
    return this.status()
  }
  async shutdown(): Promise<void> {
    ++this.generation
    this.stopAttempt()
    clearTimeout(this.sessionTimer)
    this.saved = null
    await this.disk
  }
}
