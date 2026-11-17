import { app } from 'electron'
import { join } from 'node:path'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { NotesDatabase, noteInput, noteId, noteUpdate } from './database'

export default function sqliteFeature(_context: FeatureContext): MainFeature {
  let database: NotesDatabase | undefined
  const db = () => database ??= new NotesDatabase(join(app.getPath('userData'), 'notes.sqlite3'))
  const close = () => { database?.close(); database = undefined }
  return {
    methods: {
      list: procedure(z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).max(10_000).default(0)
      }).strict(), input => db().list(input)),
      create: procedure(noteInput, input => db().create(input)),
      update: procedure(noteUpdate, input => db().update(input)),
      remove: procedure(noteId, input => db().remove(input))
    },
    beforeQuit: close,
    shutdown: close
  }
}
