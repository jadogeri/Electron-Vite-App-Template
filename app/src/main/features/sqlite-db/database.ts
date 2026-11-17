import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { asc, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export const noteInput = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().max(16_384)
}).strict()
export const noteId = z.object({ id: z.string().uuid() }).strict()
export const noteUpdate = noteInput.extend({ id: z.string().uuid() }).strict()
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})
export type Note = typeof notes.$inferSelect

// SQL is fixed application code; no renderer-provided SQL or paths are accepted.
export const migrations = [{
  version: 1,
  sql: `CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160),
    body TEXT NOT NULL CHECK(length(body) <= 16384),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ); CREATE INDEX notes_created ON notes(created_at, id);`
}]

export function migrate(db: Database.Database, steps = migrations) {
  db.transaction(() => {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL)')
    const rows = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[]
    if (rows.some(row => !steps.some(step => step.version === row.version))) throw new Error('DATABASE_VERSION_UNSUPPORTED')
    for (const step of steps) {
      if (rows.some(row => row.version === step.version)) continue
      db.exec(step.sql)
      db.prepare('INSERT INTO schema_migrations(version) VALUES (?)').run(step.version)
    }
  })()
}

export class NotesDatabase {
  private readonly sqlite: Database.Database
  private readonly orm: ReturnType<typeof drizzle>
  private closed = false
  constructor(path: string) {
    this.sqlite = new Database(path)
    try {
      this.sqlite.pragma('foreign_keys = ON')
      this.sqlite.pragma('journal_mode = WAL')
      this.sqlite.pragma('busy_timeout = 3000')
      migrate(this.sqlite)
      this.orm = drizzle(this.sqlite)
    } catch {
      this.sqlite.close()
      // Never reveal a filesystem path or the SQLite driver exception.
      throw new Error('DATABASE_OPEN_FAILED: Back up the local data folder before recovery; do not delete the database.')
    }
  }
  private check() { if (this.closed) throw new Error('DATABASE_CLOSED') }
  list(input: unknown = {}) {
    this.check()
    const { limit, offset } = z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).max(10_000).default(0)
    }).strict().parse(input)
    return this.orm.select().from(notes).orderBy(asc(notes.createdAt), asc(notes.id)).limit(limit).offset(offset).all()
  }
  create(input: unknown): Note {
    this.check()
    const parsed = noteInput.parse(input)
    return this.sqlite.transaction(() => {
      if ((this.sqlite.prepare('SELECT count(*) AS count FROM notes').get() as { count: number }).count >= 10_000)
        throw new Error('NOTE_LIMIT_REACHED')
      const now = Date.now()
      const row = { ...parsed, id: randomUUID(), createdAt: now, updatedAt: now }
      this.orm.insert(notes).values(row).run()
      return row
    })()
  }
  update(input: unknown) {
    this.check()
    const { id, ...fields } = noteUpdate.parse(input)
    return this.orm.update(notes).set({ ...fields, updatedAt: Date.now() }).where(eq(notes.id, id)).returning().get() ?? null
  }
  remove(input: unknown) {
    this.check()
    const { id } = noteId.parse(input)
    return this.orm.delete(notes).where(eq(notes.id, id)).run().changes === 1
  }
  close() {
    if (this.closed) return
    try { this.sqlite.pragma('wal_checkpoint(TRUNCATE)') }
    finally { this.sqlite.close(); this.closed = true }
  }
}
