import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ConsentGate, readConsent, redactEvent } from '../src/main/features/telemetry-sentry/privacy'
test('only current explicit consent version enables reporting', () => {
  for (const value of [undefined, true, { version: 0, enabled: true }, { version: 1, enabled: true, extra: 'x' }]) {
    assert.equal(readConsent(value).enabled, false)
  }
  assert.equal(readConsent({ version: 1, enabled: true }).enabled, true)
})
test('redaction drops synthetic secrets, paths, user text, headers, URLs and breadcrumbs', () => {
  const event = {
    tags: { safeCode: 'renderer-boundary', token: 'SYNTHETIC_SECRET' },
    message: 'SYNTHETIC_USER_TEXT', user: { email: 'private@example.test' },
    request: { url: 'https://private.test/?token=SYNTHETIC_SECRET', headers: { Authorization: 'Bearer secret' } },
    exception: { values: [{ value: '/home/alice/private C:\\Users\\alice\\secret' }] },
    breadcrumbs: [{ message: 'SYNTHETIC_USER_TEXT' }], extra: { anything: 'secret' }
  }
  assert.deepEqual(redactEvent(event, 'electron-vite-app-template@1.0.0'), {
    message: 'renderer-boundary', level: 'error', release: 'electron-vite-app-template@1.0.0', tags: { safeCode: 'renderer-boundary' }
  })
  assert.equal(redactEvent({ tags: { safeCode: 'SYNTHETIC_SECRET' } }, '1.0.0'), null)
  assert.equal(redactEvent(event, '/home/alice/private')?.release, 'unknown')
})
test('no provider load before consent; revocation closes and blocks captures', async () => {
  let loads = 0; const events: string[] = []; let closed = false
  const gate = new ConsentGate(async () => { loads++; return { capture: code => events.push(code), async stop() { closed = true } } })
  gate.capture('renderer-boundary')
  await gate.setEnabled(false)
  assert.equal(loads, 0)
  await gate.setEnabled(true)
  gate.capture('renderer-boundary')
  await gate.setEnabled(false)
  gate.capture('renderer-boundary')
  assert.deepEqual(events, ['renderer-boundary'])
  assert.equal(closed, true)
})
test('revocation while SDK loads closes late provider without sending', async () => {
  let resolve!: (value: { capture(): void; stop(): Promise<void> }) => void
  let closed = false; let captures = 0
  const gate = new ConsentGate(() => new Promise(r => { resolve = r }))
  const starting = gate.setEnabled(true)
  await Promise.resolve()
  await gate.setEnabled(false)
  resolve({ capture() { captures++ }, async stop() { closed = true } })
  await starting
  gate.capture('renderer-boundary')
  assert.equal(closed, true); assert.equal(captures, 0)
})
test('provider outage never rejects consent or capture', async () => {
  const gate = new ConsentGate(async () => { throw new Error('synthetic provider outage') })
  await gate.setEnabled(true)
  assert.doesNotThrow(() => gate.capture('renderer-boundary'))
  await gate.setEnabled(false)
})
