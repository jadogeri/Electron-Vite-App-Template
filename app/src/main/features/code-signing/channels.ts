import { z } from 'zod'
import { compare, valid, prerelease } from 'semver'
export const channelPreferenceSchema = z.object({
  channel: z.enum(['latest', 'beta', 'alpha']),
  prereleaseConsent: z.boolean()
}).strict().refine(value => value.channel === 'latest' || value.prereleaseConsent, 'Prerelease consent is required')
export type ChannelPreference = z.infer<typeof channelPreferenceSchema>
export const stablePreference: ChannelPreference = { channel: 'latest', prereleaseConsent: false }
export function readChannelPreference(value: unknown): ChannelPreference {
  const result = channelPreferenceSchema.safeParse(value)
  return result.success ? result.data : { ...stablePreference }
}
export function candidateAllowed(current: string, candidate: string, preference: ChannelPreference): boolean {
  if (!valid(current) || !valid(candidate) || compare(candidate, current) <= 0) return false
  const pre = prerelease(candidate)
  if (!pre) return true
  if (!preference.prereleaseConsent || preference.channel === 'latest') return false
  return pre[0] === 'beta' || (preference.channel === 'alpha' && pre[0] === 'alpha')
}
export interface ChannelUpdater {
  channel: string | null
  allowPrerelease: boolean
  allowDowngrade: boolean
}
let updater: ChannelUpdater | undefined
let activity = 'idle'
let preference = { ...stablePreference }
export function configureUpdateChannels(value: ChannelUpdater): void {
  updater = value
  apply()
}
function apply(): void {
  if (!updater) return
  updater.channel = preference.channel
  // electron-updater's channel setter may enable downgrade: always override LAST.
  updater.allowPrerelease = preference.channel !== 'latest' && preference.prereleaseConsent
  updater.allowDowngrade = false
}
export function updateChannelActivity(status: string): void { activity = status }
export function getChannelPreference(): ChannelPreference { return { ...preference } }
export function initializeUpdateChannels(value: unknown): void { preference = readChannelPreference(value); apply() }
export function changeUpdateChannel(value: unknown, persist: (preference: ChannelPreference) => void): ChannelPreference {
  if (!['idle', 'not-available', 'not-configured', 'error'].includes(activity)) throw new Error('Wait for the current update operation to finish')
  const next = channelPreferenceSchema.parse(value)
  persist(next)
  preference = next
  apply()
  return { ...preference }
}
export function isCandidateAllowed(current: string, candidate: string): boolean { return candidateAllowed(current, candidate, preference) }
