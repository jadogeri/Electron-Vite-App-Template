import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splashHTML, splashLifetime } from '../src/main/features/frameless-window/lifecycle'
import { controlSchema, enabledSchema } from '../src/main/features/frameless-window/validation'

test('window controls reject arbitrary targets, methods and nonboolean preferences', () => {
  for (const invalid of ['destroy', { windowId: 42, action: 'close' }, ['close'], '', null]) {
    assert.equal(controlSchema.safeParse(invalid).success, false)
  }
  assert.equal(controlSchema.parse('close'), 'close')
  assert.equal(enabledSchema.safeParse({ enabled: true, frame: false }).success, false)
  assert.equal(enabledSchema.safeParse({ enabled: 'true' }).success, false)
})

for (const first of ['ready', 'failed', 'timeout', 'closed', 'shutdown'] as const) {
  test(`splash ${first} settles once and cancels its deadline across racing events`, () => {
    let closed = 0
    let cancelled = 0
    let failures = 0
    let timeout = () => {}
    const finish = splashLifetime(() => closed++, () => failures++, fn => {
      timeout = fn
      return () => { cancelled++ }
    })
    finish(first)
    timeout()
    finish('failed')
    finish('ready')
    assert.equal(closed, 1)
    assert.equal(cancelled, 1)
    assert.equal(failures, first === 'failed' || first === 'timeout' ? 1 : 0)
  })
}
test('splash is local, isolated, accessible and disables motion', () => {
  assert.match(splashHTML, /default-src 'none'/)
  assert.match(splashHTML, /prefers-reduced-motion:reduce/)
  assert.match(splashHTML, /animation:none/)
  assert.match(splashHTML, /role="status"/)
  assert.doesNotMatch(splashHTML, /<script|https?:\/\//)
})
