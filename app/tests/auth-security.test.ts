import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, stat, writeFile, rm, symlink, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import {
  ATTEMPT_TTL_MS, AuthController, CALLBACK_URL, parseCallback, pkceChallenge,
  type Credentials, type Provider, type SessionStatus, type Vault
} from '../src/main/features/auth-security/core'
import { EncryptedVault, type Encryption } from '../src/main/features/auth-security/vault'
import { OidcProvider, boundedJson, readConfig, type Http } from '../src/main/features/auth-security/provider'
import { assertSafeData } from '../src/main/feature-procedure'

// Synthetic test data only; never obtain, snapshot, or log real account credentials.
const credentials = (): Credentials => ({ accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', expiresAt: 2_000_000 })
function fixture() {
  let now = 1_000_000
  let stored: Credentials | null = null
  let available = true
  let exchanges = 0
  let revocations = 0
  let request: { state: string; nonce: string; challenge: string } | undefined
  const events: SessionStatus[] = []
  const urls: string[] = []
  const vault: Vault = {
    available: () => available,
    read: async () => stored,
    write: async value => { stored = value },
    clear: async () => { stored = null }
  }
  const provider: Provider = {
    authorizationUrl: async input => { request = input; return 'https://id.example/authorize' },
    exchange: async () => { ++exchanges; return credentials() },
    revoke: async () => { ++revocations }
  }
  const auth = new AuthController(provider, vault, async url => { urls.push(url) }, value => events.push(value), () => now)
  return {
    auth, provider, vault, events, urls,
    request: () => request!, stored: () => stored, exchanges: () => exchanges, revocations: () => revocations,
    advance: (delta: number) => { now += delta },
    unavailable: () => { available = false },
    callback: () => `${CALLBACK_URL}?code=synthetic-code&state=${request!.state}`
  }
}
test('PKCE S256 matches RFC 7636 published vector', () => {
  assert.equal(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
})
test('callback parser rejects invalid origins, parameters, ambiguous modes, and oversized inputs', () => {
  const good = `${CALLBACK_URL}?state=abc&code=xyz`
  assert.deepEqual(parseCallback(good), { state: 'abc', code: 'xyz', denied: false })
  for (const input of [
    good.replace('electron-vite-template:', 'https:'), good.replace('auth/', 'other/'),
    good.replace('/callback', '/other'), good.replace('auth/', 'user@auth/'),
    good.replace('auth/', 'auth:123/'), good + '#fragment', CALLBACK_URL,
    `${CALLBACK_URL}?code=x`, `${CALLBACK_URL}?state=abc`, good + '&code=again',
    good + '&state=again', good + '&access_token=forbidden', good + '&error=denied',
    good + '&unexpected=x', good + '&padding=' + 'x'.repeat(8_192)
  ]) assert.equal(parseCallback(input), null)
})
test('unconfigured provider defaults disabled and cannot begin login', async () => {
  const f = fixture()
  const auth = new AuthController(null, f.vault, async () => assert.fail(), () => {})
  await auth.initialize()
  assert.equal((await auth.signIn()).state, 'disabled')
  await auth.onProtocol(`${CALLBACK_URL}?state=any&code=x`)
  assert.equal((await auth.signOut()).state, 'disabled')
})
test('all auth method results and event DTOs satisfy actual host serialization', async () => {
  const f = fixture()
  assertSafeData(f.auth.status())
  assertSafeData(await f.auth.signIn())
  assertSafeData(f.auth.cancel())
  assertSafeData(await f.auth.signIn())
  await f.auth.onProtocol(f.callback())
  assertSafeData(f.auth.status())
  assertSafeData(await f.auth.signOut())
  f.events.forEach(event => assertSafeData(event))
})
test('renderer delivery failure cannot invalidate stored session; shutdown blocks new browser actions', async () => {
  const f = fixture()
  const auth = new AuthController(f.provider, f.vault, async () => {}, () => {
    throw new Error('renderer destroyed')
  }, () => 1_000_000)
  assert.equal((await auth.signIn()).state, 'signing-in')
  await auth.onProtocol(f.callback())
  assert.equal(auth.status().state, 'signed-in')
  assert.ok(f.stored())
  await auth.signOut()
  await auth.shutdown()
  const before = f.request()
  assert.equal((await auth.signIn()).state, 'signed-out')
  assert.equal(f.request(), before)
})
test('wrong state does not consume attempt; concurrent and replay callbacks exchange exactly once', async () => {
  const f = fixture()
  await f.auth.signIn()
  await f.auth.onProtocol(`${CALLBACK_URL}?code=x&state=wrong`)
  await f.auth.onProtocol(`${f.callback()}&iss=https%3A%2F%2Fwrong.example`)
  assert.equal(f.exchanges(), 0)
  assert.equal(f.auth.status().state, 'signing-in')
  await Promise.all([f.auth.onProtocol(f.callback()), f.auth.onProtocol(f.callback())])
  await f.auth.onProtocol(f.callback())
  assert.equal(f.exchanges(), 1)
  assert.equal(f.auth.status().state, 'signed-in')
  assert.ok(f.stored())
  assert.equal(f.urls.length, 1)
  const serialized = JSON.stringify(f.events)
  for (const secret of ['synthetic-access', 'synthetic-refresh', 'synthetic-code', f.request().state, f.request().nonce]) {
    assert.equal(serialized.includes(secret), false)
  }
  await f.auth.signOut()
  assert.equal(f.stored(), null)
  assert.equal(f.revocations(), 1)
})
test('expired, provider-denied, cancelled callbacks leave recoverable signed-out state', async () => {
  const f = fixture()
  await f.auth.signIn()
  f.advance(ATTEMPT_TTL_MS)
  await f.auth.onProtocol(f.callback())
  assert.equal(f.auth.status().error, 'expired')
  assert.equal(f.exchanges(), 0)
  await f.auth.signIn()
  await f.auth.onProtocol(`${CALLBACK_URL}?state=${f.request().state}&error=access_denied`)
  assert.equal(f.auth.status().state, 'signed-out')
  await f.auth.signIn()
  const callback = f.callback()
  f.auth.cancel()
  await f.auth.onProtocol(callback)
  assert.equal(f.exchanges(), 0)
  assert.equal(f.auth.status().state, 'signed-out')
})
test('cancel during exchange cannot store credentials or re-authenticate', async () => {
  const f = fixture()
  let finish!: (value: Credentials) => void
  f.provider.exchange = () => new Promise(resolve => { finish = resolve })
  await f.auth.signIn()
  const callback = f.auth.onProtocol(f.callback())
  f.auth.cancel()
  finish(credentials())
  await callback
  assert.equal(f.stored(), null)
  assert.equal(f.auth.status().state, 'signed-out')
})
test('logout during disk write clears the late ciphertext and remains signed out', async () => {
  const f = fixture()
  const original = f.vault.write
  let finish!: () => void
  f.vault.write = async value => { await new Promise<void>(resolve => { finish = resolve }); await original(value) }
  await f.auth.signIn()
  const callback = f.auth.onProtocol(f.callback())
  while (!finish) await new Promise(resolve => setImmediate(resolve))
  const logout = f.auth.signOut()
  finish()
  await Promise.all([callback, logout])
  assert.equal(f.stored(), null)
  assert.equal(f.auth.status().state, 'signed-out')
})
test('browser, provider, and vault errors expose only fixed safe statuses', async () => {
  for (const stage of ['browser', 'provider', 'vault'] as const) {
    const f = fixture()
    const failure = async () => { throw new Error('synthetic-private-provider-response') }
    if (stage === 'browser') f.provider.authorizationUrl = failure
    if (stage === 'provider') f.provider.exchange = failure
    if (stage === 'vault') f.vault.write = failure
    await f.auth.signIn()
    if (stage !== 'browser') await f.auth.onProtocol(f.callback())
    assert.equal(f.auth.status().state, 'signed-out')
    assert.equal(f.auth.status().error, stage === 'vault' ? 'storage' : 'provider')
    assert.equal(JSON.stringify(f.events).includes('synthetic-private'), false)
  }
})
test('storage unavailable prevents browser launch; revoke failure still clears local session', async () => {
  const f = fixture()
  f.unavailable()
  await f.auth.initialize()
  assert.equal((await f.auth.signIn()).error, 'storage')
  assert.equal(f.urls.length, 0)
  const g = fixture()
  await g.auth.signIn()
  await g.auth.onProtocol(g.callback())
  g.provider.revoke = async () => { throw new Error('synthetic-private') }
  const status = await g.auth.signOut()
  assert.equal(g.stored(), null)
  assert.equal(status.state, 'signed-out')
  assert.equal(status.error, 'provider')
})
test('restoration accepts valid protected sessions and wipes expired ones', async () => {
  const f = fixture()
  await f.vault.write(credentials())
  await f.auth.initialize()
  assert.equal(f.auth.status().state, 'signed-in')
  f.advance(1_000_001)
  assert.equal(f.auth.status().state, 'signed-out')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.stored(), null)
  const g = fixture()
  await g.vault.write({ ...credentials(), expiresAt: 1 })
  await g.auth.initialize()
  assert.equal(g.auth.status().state, 'signed-out')
  assert.equal(g.stored(), null)
})
// Cipher adapter below is deliberately fake: these tests verify persistence contracts,
// not OS keychain encryption (which requires packaged Electron on each supported OS).
const fakeEncryption: Encryption = {
  isEncryptionAvailable: () => true, getSelectedStorageBackend: () => 'gnome_libsecret',
  encryptString: value => Buffer.from(value.split('').reverse().join('')),
  decryptString: value => value.toString().split('').reverse().join('')
}
test('vault atomically persists ciphertext, checks POSIX permissions where supported, and deletes on logout', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'auth-security-test-'))
  try {
    const vault = new EncryptedVault(folder, fakeEncryption, 'linux')
    await vault.write(credentials())
    const directory = join(folder, 'auth-security')
    assert.deepEqual(await readdir(directory), ['session.enc'])
    // Windows stat/chmod mode bits do not establish NTFS ACL confidentiality.
    // Ciphertext, round-trip, cleanup and deletion checks below still run on all OSes.
    if (process.platform !== 'win32') {
      assert.equal((await stat(directory)).mode & 0o777, 0o700)
      assert.equal((await stat(join(directory, 'session.enc'))).mode & 0o777, 0o600)
    }
    assert.equal((await readFile(join(directory, 'session.enc'))).includes(Buffer.from('synthetic-access')), false)
    assert.deepEqual(await vault.read(), credentials())
    await vault.clear()
    assert.equal(await vault.read(), null)
  } finally { await rm(folder, { recursive: true, force: true }) }
})
test('vault rejects Linux plaintext/unknown backend, unavailable keychain, corruption and symlinks', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'auth-security-test-'))
  try {
    for (const backend of ['basic_text', 'unknown', undefined]) {
      const vault = new EncryptedVault(folder, { ...fakeEncryption, getSelectedStorageBackend: () => backend! }, 'linux')
      assert.equal(vault.available(), false)
      await assert.rejects(() => vault.write(credentials()), /^Error: Credential storage unavailable$/)
    }
    const unavailable = new EncryptedVault(folder, { ...fakeEncryption, isEncryptionAvailable: () => false }, 'darwin')
    assert.equal(unavailable.available(), false)
    const vault = new EncryptedVault(folder, fakeEncryption, 'linux')
    await vault.write(credentials())
    const file = join(folder, 'auth-security/session.enc')
    await writeFile(file, 'corrupt')
    await assert.rejects(() => vault.read(), /^Error: Credential storage unavailable$/)
    await rm(file)
    await symlink(join(folder, 'external'), file)
    await assert.rejects(() => vault.read(), /^Error: Credential storage unavailable$/)
    await rm(join(folder, 'auth-security'), { recursive: true, force: true })
    await mkdir(join(folder, 'external-directory'))
    await symlink(join(folder, 'external-directory'), join(folder, 'auth-security'))
    await assert.rejects(() => vault.write(credentials()), /^Error: Credential storage unavailable$/)
  } finally { await rm(folder, { recursive: true, force: true }) }
})
test('config is disabled by default and rejects insecure URLs, missing public client ID, and missing openid', () => {
  assert.equal(readConfig({}), null)
  for (const env of [
    { ELECTRON_OIDC_ISSUER: 'http://id.example' },
    { ELECTRON_OIDC_ISSUER: 'https://user:pass@id.example', ELECTRON_OIDC_CLIENT_ID: 'public' },
    { ELECTRON_OIDC_ISSUER: 'https://id.example?q=x', ELECTRON_OIDC_CLIENT_ID: 'public' },
    { ELECTRON_OIDC_ISSUER: 'https://id.example', ELECTRON_OIDC_CLIENT_ID: 'public', ELECTRON_OIDC_SCOPES: 'email' }
  ]) assert.throws(() => readConfig(env), /^Error: Authentication configuration invalid$/)
})

const issuer = 'https://id.example'
const config = { issuer, clientId: 'public-desktop', scopes: 'openid' }
async function oidcFixture(claims: Record<string, unknown> = {}) {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const jwk = await exportJWK(publicKey)
  const now = Math.floor(Date.now() / 1_000)
  const jwt = await new SignJWT({ nonce: 'expected-nonce', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(typeof claims.iss === 'string' ? claims.iss : issuer)
    .setAudience(typeof claims.aud === 'string' ? claims.aud : config.clientId)
    .setSubject('synthetic-subject').setIssuedAt(now).setExpirationTime(now + 600).sign(privateKey)
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const http: Http = async (url, init) => {
    requests.push({ url, init })
    if (url.endsWith('openid-configuration')) return Response.json({
      issuer, authorization_endpoint: issuer + '/authorize', token_endpoint: issuer + '/token',
      jwks_uri: issuer + '/jwks', revocation_endpoint: issuer + '/revoke',
      response_types_supported: ['code'], code_challenge_methods_supported: ['S256'],
      id_token_signing_alg_values_supported: ['RS256']
    })
    if (url.endsWith('/token')) return Response.json({
      access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', token_type: 'Bearer',
      expires_in: 600, id_token: jwt
    })
    if (url.endsWith('/jwks')) return Response.json({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256' }] })
    if (url.endsWith('/revoke')) return new Response(null, { status: 200 })
    throw new Error('synthetic-private-network-error')
  }
  return { provider: new OidcProvider(config, http), http, requests, privateKey }
}
test('OIDC verifies a real signature/issuer/audience/nonce and posts public-client PKCE exchange', async () => {
  const f = await oidcFixture()
  const url = new URL(await f.provider.authorizationUrl({ state: 'synthetic-state', nonce: 'expected-nonce', challenge: 'challenge' }))
  assert.equal(url.searchParams.get('redirect_uri'), CALLBACK_URL)
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(url.searchParams.get('response_type'), 'code')
  const result = await f.provider.exchange({ code: 'synthetic-code', verifier: 'synthetic-verifier', nonce: 'expected-nonce' })
  assert.equal(result.accessToken, 'synthetic-access')
  const tokenRequest = f.requests.find(request => request.url.endsWith('/token'))!
  const body = new URLSearchParams(tokenRequest.init!.body as string)
  assert.equal(body.get('code_verifier'), 'synthetic-verifier')
  assert.equal(body.has('client_secret'), false)
  assert.equal(tokenRequest.init!.redirect, 'error')
  assert.equal(tokenRequest.init!.credentials, 'omit')
  await f.provider.revoke(result)
  assert.equal(f.requests.filter(request => request.url.endsWith('/revoke')).length, 2)
})
test('OIDC rejects wrong nonce, issuer, audience and authorized party without leaking provider content', async () => {
  for (const claims of [
    { nonce: 'wrong' }, { iss: 'https://wrong.example' }, { aud: 'wrong-client' }, { azp: 'wrong-party' }
  ]) {
    const f = await oidcFixture(claims)
    await assert.rejects(
      () => f.provider.exchange({ code: 'synthetic-code', verifier: 'synthetic-verifier', nonce: 'expected-nonce' }),
      /^Error: Sign-in could not be verified$/
    )
  }
})
test('OIDC fails closed on unsigned, expired, or wrong-key ID tokens and missing key material', async () => {
  for (const mode of ['unsigned', 'expired', 'wrong-key', 'missing-keys']) {
    const f = await oidcFixture()
    const otherKey = await generateKeyPair('RS256')
    const provider = new OidcProvider(config, async (url, init) => {
      const response = await f.http(url, init)
      if (mode === 'missing-keys' && url.endsWith('/jwks')) return Response.json({ keys: [] })
      if (url.endsWith('/token')) {
        const body = await response.json() as Record<string, unknown>
        if (mode === 'unsigned') {
          body.id_token = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"nonce":"expected-nonce"}').toString('base64url')}.`
        } else {
          body.id_token = await new SignJWT({ nonce: 'expected-nonce' })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer(issuer)
            .setAudience(config.clientId).setSubject('synthetic-subject').setIssuedAt()
            .setExpirationTime(mode === 'expired' ? 1 : Math.floor(Date.now() / 1_000) + 600)
            .sign(mode === 'expired' ? f.privateKey : otherKey.privateKey)
        }
        return Response.json(body)
      }
      return response
    })
    await assert.rejects(() => provider.exchange({
      code: 'synthetic-code', verifier: 'synthetic-verifier', nonce: 'expected-nonce'
    }), /^Error: Sign-in could not be verified$/)
  }
})
test('OIDC rejects metadata issuer mismatch and insecure discovered endpoints before opening browser', async () => {
  for (const change of [
    { issuer: 'https://wrong.example' }, { token_endpoint: 'http://id.example/token' },
    { code_challenge_methods_supported: ['plain'] }, { response_types_supported: ['token'] }
  ]) {
    const f = await oidcFixture()
    const provider = new OidcProvider(config, async (url, init) => {
      const result = await f.http(url, init)
      if (url.endsWith('openid-configuration')) return Response.json({ ...await result.json() as object, ...change })
      return result
    })
    await assert.rejects(() => provider.authorizationUrl({
      state: 'synthetic-state', nonce: 'expected-nonce', challenge: 'challenge'
    }), /^Error: Identity provider configuration invalid$/)
  }
})
test('bounded HTTP rejects oversized streams, non-2xx, invalid JSON, and network errors with safe messages', async () => {
  for (const http of [
    async () => new Response('x'.repeat(131_073)),
    async () => new Response('synthetic-private-response', { status: 401 }),
    async () => new Response('synthetic-private-invalid-json'),
    async () => { throw new Error('synthetic-private-network-error') }
  ] satisfies Http[]) {
    await assert.rejects(() => boundedJson(http, issuer), /^Error: Identity provider request failed$/)
  }
})
