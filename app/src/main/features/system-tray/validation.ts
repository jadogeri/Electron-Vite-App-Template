import { z } from 'zod'
export const notificationSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(500)
}).strict()
export const preferencesSchema = z.object({ background: z.boolean(), notifications: z.boolean() }).strict()
