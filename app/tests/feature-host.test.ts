import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { assertSafeData, procedure } from '../src/main/feature-procedure'
import { boundedCallback } from '../src/main/protocol'
import type { IpcMainInvokeEvent } from 'electron'

test('feature procedure validates before calling a privileged implementation', async () => {
  let calls = 0
  const method = procedure(z.object({ id: z.string().uuid() }).strict(), input => { calls++; return input.id })
  const event = {} as IpcMainInvokeEvent
  assert.throws(() => method({ id: '../secret' }, event))
  assert.throws(() => method({ id: '2d07fc07-911a-49e3-bcc2-4e632ead0351', arbitrary: true }, event))
  assert.equal(calls, 0)
  assert.equal(await method({ id: '2d07fc07-911a-49e3-bcc2-4e632ead0351' }, event), '2d07fc07-911a-49e3-bcc2-4e632ead0351')
})
test('feature data boundary permits plain bounded DTOs only', () => {
  assertSafeData({ notes: [{ id: 'a', count: 1 }], ready: true, value: null })
  assertSafeData(undefined)
  for (const bad of [new Date(), new Map(), Infinity, () => {}, { value: undefined }, JSON.parse('{"__proto__":{}}')]) {
    assert.throws(() => assertSafeData(bad))
  }
  const cycle: Record<string, unknown> = {}; cycle.self = cycle
  assert.throws(() => assertSafeData(cycle))
  assert.throws(() => assertSafeData('x'.repeat(1024 * 1024)))
  assert.throws(() => assertSafeData(Array(20001).fill(null)))
  let deep: unknown = null
  for (let i = 0; i < 26; i++) deep = { child: deep }
  assert.throws(() => assertSafeData(deep))
})
test('native callback accepts only bounded fixed auth destination', () => {
  assert.equal(boundedCallback('electron-vite-template://auth/callback?code=a&state=b'), 'electron-vite-template://auth/callback?code=a&state=b')
  for (const url of ['https://auth/callback', 'electron-vite-template://evil/callback', 'electron-vite-template://auth/other', 'electron-vite-template://user@auth/callback', 'electron-vite-template://auth/callback#code=a', 'x'.repeat(8193)]) {
    assert.equal(boundedCallback(url), null)
  }
})
