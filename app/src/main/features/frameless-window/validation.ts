import { z } from 'zod'
export const controlSchema = z.enum(['minimize', 'maximize', 'close'])
export const enabledSchema = z.object({ enabled: z.boolean() }).strict()
