import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { NotesDatabase, migrate, migrations } from '../src/main/features/sqlite-db/database'

test('SQLite migrates fresh disk, uses Drizzle CRUD and survives repeat startup', () => {
  const directory = mkdtempSync(join(tmpdir(), 'sqlite-feature-'))
  let database: NotesDatabase | undefined
  try {
    const path = join(directory, 'notes.sqlite3')
    database = new NotesDatabase(path)
    assert.deepEqual(database.list(), [])
    const note = database.create({ title: 'first', body: "'; DROP TABLE notes; --" })
    assert.match(note.id, /^[0-9a-f-]{36}$/)
    assert.equal(database.list()[0].body, "'; DROP TABLE notes; --")
    assert.equal(database.update({ id: note.id, title: 'edited', body: 'body' })?.title, 'edited')
    database.close(); database.close()
    assert.throws(() => database!.list(), /DATABASE_CLOSED/)
    database = new NotesDatabase(path)
    assert.equal(database.list()[0].id, note.id)
    assert.equal(database.remove({ id: note.id }), true)
    assert.equal(database.remove({ id: note.id }), false)
    assert.deepEqual(database.list(), [])
    const raw = new Database(path)
    assert.equal((raw.prepare('SELECT count(*) AS n FROM schema_migrations').get() as { n: number }).n, 1)
    raw.close()
  } finally { database?.close(); rmSync(directory, { recursive: true, force: true }) }
})
test('SQLite rejects malformed, oversized and renderer-supplied SQL/path inputs', () => {
  const database = new NotesDatabase(':memory:')
  try {
    for (const input of [{ title: '', body: '' }, { title: 'a'.repeat(161), body: '' },
      { title: 'ok', body: 'b'.repeat(16_385) }, { title: 'ok', body: '', sql: 'DROP TABLE notes' }])
      assert.throws(() => database.create(input))
    assert.throws(() => database.remove({ id: '../data' }))
    assert.throws(() => database.list({ limit: 101 }))
    assert.throws(() => database.list({ path: '/tmp/other' }))
    assert.deepEqual(database.list(), [])
  } finally { database.close() }
})
test('Migration failure rolls back schema and version together, preserving old notes', () => {
  const database = new Database(':memory:')
  try {
    migrate(database)
    database.prepare('INSERT INTO notes VALUES (?,?,?,?,?)').run('existing', 'keep', 'data', 1, 1)
    assert.throws(() => migrate(database, [...migrations, {
      version: 2, sql: 'CREATE TABLE partial(value TEXT); INSERT INTO missing_table VALUES (1);'
    }]))
    assert.equal((database.prepare('SELECT title FROM notes').get() as { title: string }).title, 'keep')
    assert.equal(database.prepare("SELECT name FROM sqlite_master WHERE name='partial'").get(), undefined)
    assert.deepEqual(database.prepare('SELECT version FROM schema_migrations').all(), [{ version: 1 }])
    assert.throws(() => migrate(database, []), /DATABASE_VERSION_UNSUPPORTED/)
  } finally { database.close() }
})
test('Synchronous operations serialize safely and checkpoint on shutdown', () => {
  const database = new NotesDatabase(':memory:')
  for (let n = 0; n < 100; n++) database.create({ title: `note ${n}`, body: 'test' })
  assert.equal(database.list({ limit: 100 }).length, 100)
  assert.equal(new Set(database.list({ limit: 100 }).map(note => note.id)).size, 100)
  database.close()
})
