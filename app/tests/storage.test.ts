import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readJsonStore, updateJsonStore } from '../src/main/storage'

test('JSON storage recovers from malformed data and serializes concurrent writes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'electron-starter-'))
  try {
    await writeFile(join(directory, 'state.json'), '{broken')
    assert.deepEqual(await readJsonStore(directory, 'state.json', { count: 0 }), { count: 0 })
    await Promise.all(Array.from({ length: 20 }, () =>
      updateJsonStore(directory, 'state.json', { count: 0 }, (state) => { state.count++ })))
    assert.equal(JSON.parse(await readFile(join(directory, 'state.json'), 'utf8')).count, 20)
  } finally { await rm(directory, { recursive: true, force: true }) }
})
