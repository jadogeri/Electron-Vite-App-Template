import { test } from 'node:test'
import assert from 'node:assert/strict'
import { commands, commandIds, commandMenu, filterCommands, globalAccelerator, optionalGlobalShortcut } from '../src/main/features/command-palette/commands'
import { localShortcut, trapTab } from '../src/renderer/src/features/command-palette/focus'
import { commandSchema, contextMenuSchema } from '../src/main/features/command-palette/validation'

test('unknown command/context IDs, renderer-supplied roles and unbounded menus are rejected', () => {
  for (const invalid of ['quit', 'shell:open', { id: 'home' }, null, '']) {
    assert.equal(commandSchema.safeParse(invalid).success, false)
  }
  assert.equal(contextMenuSchema.safeParse({ commands: ['home', 'shell:exec'] }).success, false)
  assert.equal(contextMenuSchema.safeParse({ commands: ['home'], role: 'quit' }).success, false)
  assert.equal(contextMenuSchema.safeParse({ commands: Array(8).fill('home') }).success, false)
  assert.deepEqual(contextMenuSchema.parse({ commands: ['home', 'settings'] }), { commands: ['home', 'settings'] })
})

test('registry filters case-insensitively with multiword keywords and no matches', () => {
  assert.equal(new Set(commandIds).size, commands.length)
  assert.deepEqual(filterCommands('THEME NIGHT').map(c => c.id), ['theme-dark'])
  assert.deepEqual(filterCommands('preferences').map(c => c.id), ['settings'])
  assert.deepEqual(filterCommands('nothing matches this'), [])
  assert.equal(filterCommands('').length, commands.length)
})
test('native menu executes only centralized allowlisted identifiers', () => {
  const seen: string[] = []
  const menu = commandMenu(id => seen.push(id))
  menu.forEach(item => item.click())
  assert.deepEqual(seen, [...commandIds])
  assert.equal(menu[0].label, commands[0].label)
})
test('optional OS shortcut defaults off; conflict recovery never removes another app registration', () => {
  let registrations = 0; const removed: string[] = []
  let callback = () => {}; let conflict = true
  const shortcut = optionalGlobalShortcut({
    register(accelerator, fn) { assert.equal(accelerator, globalAccelerator); callback = fn; registrations++; return !conflict },
    unregister(accelerator) { removed.push(accelerator) }
  }, () => { opened++ })
  let opened = 0
  assert.deepEqual(shortcut.setEnabled(false), { enabled: false, registered: false, conflict: false })
  assert.equal(registrations, 0)
  assert.equal(shortcut.setEnabled(true).conflict, true)
  shortcut.setEnabled(false)
  assert.equal(removed.length, 0)
  conflict = false
  assert.equal(shortcut.setEnabled(true).registered, true)
  shortcut.setEnabled(true)
  assert.equal(registrations, 2)
  callback(); assert.equal(opened, 1)
  shortcut.shutdown(); shortcut.shutdown()
  assert.deepEqual(removed, [globalAccelerator])
})
test('OS exceptions are a recoverable conflict, not a crash', () => {
  const shortcut = optionalGlobalShortcut({ register() { throw new Error('backend unavailable') }, unregister() {} }, () => {})
  assert.equal(shortcut.setEnabled(true).conflict, true)
})
test('local shortcuts respect IME composition, alt modifiers, handled keys and repeat', () => {
  const event = { defaultPrevented: false, isComposing: false, repeat: false, altKey: false, shiftKey: false, metaKey: false, ctrlKey: true, key: 'k' }
  assert.equal(localShortcut(event), 'toggle')
  assert.equal(localShortcut({ ...event, ctrlKey: false, metaKey: true, key: ',' }), 'settings')
  for (const key of ['defaultPrevented', 'isComposing', 'repeat', 'altKey', 'shiftKey']) {
    assert.equal(localShortcut({ ...event, [key]: true }), null)
  }
  assert.equal(localShortcut({ ...event, ctrlKey: false }), null)
})
test('focus trap wraps both directions, recovers escaped focus and handles an empty dialog', () => {
  // DOM-shaped stateful fakes exercise focus transitions without adding a runtime dependency.
  let active: unknown = null
  let prevented = 0
  const document = { get activeElement() { return active } }
  const element = () => ({ hidden: false, closest: () => null, getAttribute: () => null, focus() { active = this } })
  const first = element(); const last = element()
  let children = [first, last]
  const container = {
    querySelectorAll: () => children, ownerDocument: document,
    contains: (node: unknown) => children.includes(node as typeof first),
    focus() { active = this }
  } as unknown as HTMLElement
  const tab = (shiftKey = false) => trapTab(container, { key: 'Tab', shiftKey, preventDefault() { prevented++ } })
  active = last; tab(); assert.equal(active, first)
  tab(true); assert.equal(active, last)
  active = {}; tab(); assert.equal(active, first)
  children = []; tab(); assert.equal(active, container)
  assert.equal(prevented, 4)
})
