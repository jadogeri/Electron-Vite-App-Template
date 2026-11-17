import { z } from 'zod'
import { commandIds } from './commands'
export const commandSchema = z.enum(commandIds)
export const contextMenuSchema = z.object({
  commands: z.array(commandSchema).min(1).max(commandIds.length)
}).strict()
