import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeExternalURL, saveFileSchema, settingsSchema, themeSchema, updatePercent, windowStateSchema } from '../src/shared/validation'

test('external links allow only HTTP(S) without embedded credentials', () => {
  assert.equal(safeExternalURL('https://electronjs.org/docs'), 'https://electronjs.org/docs')
  assert.equal(safeExternalURL('http://example.com'), 'http://example.com/')
  for (const value of ['file:///etc/passwd', 'javascript:alert(1)', 'myapp://auth', 'https://user:password@example.com', 'not a url']) {
    assert.equal(safeExternalURL(value), null)
  }
})
test('settings validate themes and default to the OS', () => {
  assert.deepEqual(settingsSchema.parse({}), { theme: 'system' })
  assert.equal(themeSchema.parse('dark'), 'dark')
  assert.equal(themeSchema.safeParse('auto').success, false)
})
test('window state rejects invalid dimensions and accepts negative monitor coordinates', () => {
  assert.equal(windowStateSchema.parse({}).width, 1000)
  assert.equal(windowStateSchema.parse({ x: -1920 }).x, -1920)
  assert.equal(windowStateSchema.safeParse({ width: -10 }).success, false)
})
test('save dialog parameters reject paths and excessive contents', () => {
  assert.deepEqual(saveFileSchema.parse(['notes.txt', 'hello']), ['notes.txt', 'hello'])
  for (const name of ['../secret', 'dir\\file', '']) assert.equal(saveFileSchema.safeParse([name, '']).success, false)
})
test('update progress is a finite clamped integer', () => {
  for (const [input, expected] of [[NaN, 0], [Infinity, 0], [-2, 0], [49.7, 50], [120, 100]]) {
    assert.equal(updatePercent(input), expected)
  }
})
