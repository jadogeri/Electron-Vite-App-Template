import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { candidateAllowed, readChannelPreference, changeUpdateChannel, initializeUpdateChannels, configureUpdateChannels, updateChannelActivity, getChannelPreference } from '../src/main/features/code-signing/channels'
const require = createRequire(import.meta.url)
const { validateSigning } = require('../scripts/signing/validate.cjs')
test('signed releases fail closed without credentials on each target', () => {
  assert.throws(() => validateSigning('darwin', {}), /Missing signing configuration/)
  assert.throws(() => validateSigning('win32', {}), /Missing signing configuration/)
  assert.throws(() => validateSigning('linux', {}), /require macOS or Windows/)
  assert.throws(() => validateSigning('darwin', { CSC_LINK: 'synthetic', CSC_KEY_PASSWORD: 'synthetic', APPLE_ID: 'synthetic', APPLE_APP_SPECIFIC_PASSWORD: 'synthetic', APPLE_TEAM_ID: 'ABCDEFGHIJ', CSC_NAME: '-' }), /Ad hoc/)
})
test('stable rejects prereleases and never downgrades from beta on stable return', () => {
  const stable = { channel: 'latest', prereleaseConsent: false } as const
  assert.equal(candidateAllowed('1.0.0', '1.1.0-beta.1', stable), false)
  assert.equal(candidateAllowed('2.0.0-beta.1', '1.9.0', stable), false)
  assert.equal(candidateAllowed('2.0.0-beta.1', '2.0.0', stable), true)
  assert.equal(candidateAllowed('bad', '2.0.0', stable), false)
  assert.equal(candidateAllowed('1.0.0', '1.0.0', stable), false)
})
test('beta and alpha require explicit consent and coherent channels', () => {
  assert.deepEqual(readChannelPreference({ channel: 'beta', prereleaseConsent: false }), { channel: 'latest', prereleaseConsent: false })
  assert.equal(candidateAllowed('1.0.0', '2.0.0-alpha.1', { channel: 'beta', prereleaseConsent: true }), false)
  assert.equal(candidateAllowed('1.0.0', '2.0.0-beta.1', { channel: 'beta', prereleaseConsent: true }), true)
  assert.equal(candidateAllowed('1.0.0', '2.0.0-alpha.1', { channel: 'alpha', prereleaseConsent: true }), true)
  assert.equal(candidateAllowed('1.0.0', '2.0.0-dev.1', { channel: 'alpha', prereleaseConsent: true }), false)
})
test('channel updates persist, reset electron-updater downgrade and reject active operations', () => {
  let channel: string | null = null
  const updater = { get channel() { return channel }, set channel(value) { channel = value; this.allowDowngrade = true }, allowDowngrade: true, allowPrerelease: true }
  initializeUpdateChannels(undefined); configureUpdateChannels(updater)
  assert.equal(updater.channel, 'latest'); assert.equal(updater.allowDowngrade, false)
  for (const status of ['checking', 'available', 'downloading', 'downloaded', 'installing']) {
    updateChannelActivity(status)
    assert.throws(() => changeUpdateChannel({ channel: 'beta', prereleaseConsent: true }, () => assert.fail()))
  }
  updateChannelActivity('error')
  let persisted: unknown
  changeUpdateChannel({ channel: 'beta', prereleaseConsent: true }, value => { persisted = value })
  initializeUpdateChannels(persisted)
  assert.equal(getChannelPreference().channel, 'beta')
  assert.equal(updater.allowPrerelease, true); assert.equal(updater.allowDowngrade, false)
  assert.throws(() => changeUpdateChannel({ channel: 'latest', prereleaseConsent: false }, () => { throw new Error() }))
  assert.equal(getChannelPreference().channel, 'beta')
})
