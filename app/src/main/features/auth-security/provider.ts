import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose'
import { z } from 'zod'
import { CALLBACK_URL, type Credentials, type Provider } from './core'

const secureUrl = z.string().max(2_048).url().refine(value => {
  const url = new URL(value)
  return url.protocol === 'https:' && !url.username && !url.password && !url.hash
})
const discoverySchema = z.object({
  issuer: secureUrl,
  authorization_endpoint: secureUrl,
  token_endpoint: secureUrl,
  jwks_uri: secureUrl,
  revocation_endpoint: secureUrl.optional(),
  response_types_supported: z.array(z.string()).max(32),
  id_token_signing_alg_values_supported: z.array(z.string()).max(32),
  code_challenge_methods_supported: z.array(z.string()).max(32).optional()
})
export type OidcConfig = { issuer: string; clientId: string; scopes: string }
export function readConfig(env: Record<string, string | undefined>): OidcConfig | null {
  const issuer = env.ELECTRON_OIDC_ISSUER
  const clientId = env.ELECTRON_OIDC_CLIENT_ID
  if (!issuer && !clientId) return null
  if (!issuer || !clientId || !secureUrl.safeParse(issuer).success ||
      new URL(issuer).search || !/^[\x21-\x7e]{1,256}$/.test(clientId)) {
    throw new Error('Authentication configuration invalid')
  }
  const scopes = env.ELECTRON_OIDC_SCOPES || 'openid'
  if (scopes.length > 512 || !/^[a-zA-Z0-9:._ /-]+$/.test(scopes) ||
      !scopes.split(' ').includes('openid')) throw new Error('Authentication configuration invalid')
  return { issuer, clientId, scopes }
}
export type Http = (url: string, init?: RequestInit) => Promise<Response>
/** Uses independent, bounded requests; follows no redirects and includes no cookies. */
export async function boundedJson(http: Http, url: string, init: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await http(url, {
      ...init, signal: controller.signal, redirect: 'error', credentials: 'omit',
      headers: { Accept: 'application/json', ...init.headers }
    })
    if (!response.ok || !response.body) throw new Error('request')
    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > 131_072) throw new Error('size')
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > 131_072) throw new Error('size')
        chunks.push(chunk.value)
      }
    } finally {
      await reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch { throw new Error('Identity provider request failed') } finally { clearTimeout(timeout) }
}
export class OidcProvider implements Provider {
  constructor(private config: OidcConfig, private http: Http = fetch, private now = Date.now) {}
  get issuer(): string { return this.config.issuer }
  private async discovery() {
    const document = discoverySchema.parse(await boundedJson(
      this.http, `${this.config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`
    ))
    if (document.issuer !== this.config.issuer || !document.response_types_supported.includes('code') ||
        (document.code_challenge_methods_supported && !document.code_challenge_methods_supported.includes('S256'))) {
      throw new Error('Identity provider configuration invalid')
    }
    return document
  }
  async authorizationUrl(input: { state: string; nonce: string; challenge: string }): Promise<string> {
    try {
      const document = await this.discovery()
      const url = new URL(document.authorization_endpoint)
      const parameters = {
        client_id: this.config.clientId, redirect_uri: CALLBACK_URL, response_type: 'code',
        response_mode: 'query', scope: this.config.scopes, state: input.state, nonce: input.nonce,
        code_challenge: input.challenge, code_challenge_method: 'S256'
      }
      for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value)
      return url.toString()
    } catch { throw new Error('Identity provider configuration invalid') }
  }
  async exchange(input: { code: string; verifier: string; nonce: string }): Promise<Credentials> {
    try {
      const document = await this.discovery()
      const response = z.object({
        access_token: z.string().min(1).max(16_384),
        refresh_token: z.string().min(1).max(16_384).optional(),
        id_token: z.string().min(1).max(32_768),
        token_type: z.string().refine(value => value.toLowerCase() === 'bearer'),
        expires_in: z.number().int().min(1).max(31_536_000)
      }).parse(await boundedJson(this.http, document.token_endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code', client_id: this.config.clientId, redirect_uri: CALLBACK_URL,
          code: input.code, code_verifier: input.verifier
        }).toString()
      }))
      const jwks = z.object({ keys: z.array(z.record(z.unknown())).min(1).max(32) })
        .parse(await boundedJson(this.http, document.jwks_uri))
      const algorithms = ['RS256', 'PS256', 'ES256', 'EdDSA']
        .filter(algorithm => document.id_token_signing_alg_values_supported.includes(algorithm))
      if (!algorithms.length) throw new Error('algorithm')
      const { payload } = await jwtVerify(response.id_token, createLocalJWKSet(jwks as JSONWebKeySet), {
        issuer: this.config.issuer, audience: this.config.clientId, algorithms,
        requiredClaims: ['iss', 'sub', 'aud', 'exp', 'iat', 'nonce'],
        currentDate: new Date(this.now()), clockTolerance: 5
      })
      if (payload.nonce !== input.nonce || typeof payload.sub !== 'string' || !payload.sub ||
          (payload.azp !== undefined && payload.azp !== this.config.clientId) ||
          (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== this.config.clientId) ||
          (typeof payload.iat === 'number' && payload.iat > this.now() / 1_000 + 5)) throw new Error('claims')
      return {
        accessToken: response.access_token, refreshToken: response.refresh_token,
        expiresAt: Math.min(this.now() + response.expires_in * 1_000, payload.exp! * 1_000)
      }
    } catch { throw new Error('Sign-in could not be verified') }
  }
  async revoke(value: Credentials): Promise<void> {
    try {
      const document = await this.discovery()
      if (!document.revocation_endpoint) return
      // RFC 7009 can return an empty successful body, unlike JSON token endpoints.
      for (const [token, hint] of [[value.refreshToken, 'refresh_token'], [value.accessToken, 'access_token']]) {
        if (!token) continue
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10_000)
        try {
          const result = await this.http(document.revocation_endpoint, {
            method: 'POST', redirect: 'error', credentials: 'omit', signal: controller.signal,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: this.config.clientId, token, token_type_hint: hint!
            }).toString()
          })
          await result.body?.cancel()
          if (!result.ok) throw new Error('revoke')
        } finally { clearTimeout(timeout) }
      }
    } catch { throw new Error('Remote session revocation unavailable') }
  }
}
