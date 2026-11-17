type Policy = {
  configureUpdateChannels(value: { channel: string | null; allowPrerelease: boolean; allowDowngrade: boolean }): void
  updateChannelActivity(status: string): void
  isCandidateAllowed(current: string, candidate: string): boolean
}
const policies = import.meta.glob<Policy>('./features/code-signing/channels.ts', { eager: true })
const policy = policies['./features/code-signing/channels.ts']
export const configureUpdateChannels: Policy['configureUpdateChannels'] = updater => { policy?.configureUpdateChannels(updater) }
export const updateChannelActivity: Policy['updateChannelActivity'] = status => { policy?.updateChannelActivity(status) }
export const isCandidateAllowed: Policy['isCandidateAllowed'] = (current, candidate) => policy?.isCandidateAllowed(current, candidate) ?? true
