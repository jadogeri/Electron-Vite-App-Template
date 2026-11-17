import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { deliverNotification, trayLifecycle } from '../src/main/features/system-tray/lifecycle'
import { colorPNG, templatePNG } from '../src/main/features/system-tray/icons'
import { notificationSchema, preferencesSchema } from '../src/main/features/system-tray/validation'

test('notification text and preferences are bounded strict data, never arbitrary options', () => {
  assert.deepEqual(notificationSchema.parse({ title: ' hello ', body: ' world ' }), { title: 'hello', body: 'world' })
  for (const invalid of [
    { title: '', body: 'text' }, { title: 't'.repeat(101), body: 'text' },
    { title: 'Title', body: 'b'.repeat(501) }, { title: 'Title', body: 'text', icon: '/private/path' },
    { title: 'Title', body: 'text', urgency: 'critical' }
  ]) assert.equal(notificationSchema.safeParse(invalid).success, false)
  assert.equal(preferencesSchema.safeParse({ background: true, notifications: true, unrelated: true }).success, false)
})

test('hide only with explicit background choice and a real available tray', () => {
  const life = trayLifecycle()
  for (const [enabled, available, expected] of [[false, false, false], [true, false, false], [false, true, false], [true, true, true]]) {
    life.configure(enabled, available)
    assert.equal(life.shouldHide(), expected)
    assert.equal(life.keepAlive(), expected)
  }
  life.beforeQuit()
  assert.equal(life.shouldHide(), false)
  assert.equal(life.keepAlive(), false)
  life.configure(true, true)
  assert.equal(life.shouldHide(), false, 'quit/update restart cannot reenable hide')
})

class FakeNotification extends EventEmitter {
  shows = 0; closes = 0
  show() { this.shows++ }
  close() { this.closes++; this.emit('close') }
}
function fixture(allowed = true, supported = true, throws = false) {
  const notification = new FakeNotification()
  let restored = 0; let fallbacks = 0; let finished = 0
  const delivery = deliverNotification({
    allowed, supported,
    create: () => { if (throws) throw new Error('private backend details'); return notification },
    restore: () => { restored++ },
    fallback: () => { fallbacks++ },
    finished: () => { finished++ }
  })
  return { notification, delivery, counts: () => ({ restored, fallbacks, finished }) }
}
for (const [allowed, supported] of [[false, true], [true, false], [false, false]]) {
  test(`notification capability/consent fallback (${allowed}, ${supported})`, () => {
    const f = fixture(allowed, supported)
    assert.equal(f.delivery.native, false)
    assert.equal(f.notification.shows, 0)
    assert.deepEqual(f.counts(), { restored: 0, fallbacks: 1, finished: 1 })
  })
}
test('OS denial emits one fallback and destroys listeners', () => {
  const f = fixture()
  f.notification.emit('failed')
  f.notification.emit('failed')
  f.delivery.cleanup()
  assert.deepEqual(f.counts(), { restored: 0, fallbacks: 1, finished: 1 })
  assert.equal(f.notification.closes, 1)
  assert.equal(f.notification.listenerCount('click'), 0)
})
test('notification click restores existing window exactly once', () => {
  const f = fixture()
  assert.equal(f.delivery.native, true)
  f.notification.emit('click')
  f.notification.emit('click')
  f.delivery.cleanup()
  assert.deepEqual(f.counts(), { restored: 1, fallbacks: 0, finished: 1 })
  assert.equal(f.notification.closes, 1)
})
test('construction errors safely fall back without leaking backend diagnostics', () => {
  const f = fixture(true, true, true)
  assert.deepEqual(f.counts(), { restored: 0, fallbacks: 1, finished: 1 })
})
test('template and color assets are distinct native PNGs of intended sizes', () => {
  const mono = Buffer.from(templatePNG, 'base64')
  const color = Buffer.from(colorPNG, 'base64')
  assert.equal(mono.subarray(1, 4).toString(), 'PNG')
  assert.equal(color.subarray(1, 4).toString(), 'PNG')
  assert.equal(mono.readUInt32BE(16), 16)
  assert.equal(color.readUInt32BE(16), 32)
  assert.notDeepEqual(mono, color)
})
