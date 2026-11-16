import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { GitHubProvider } from 'electron-updater/out/providers/GitHubProvider'
import { createUpdateErrorReporter, isEmptyReleaseFeed, performUpdateCheck } from '../src/main/update-errors'
import type { UpdateState } from '../src/shared/types'

const emptyFeed = '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Releases</title></feed>'

function providerWith(request: (options: { path?: string }) => Promise<string>) {
  type Runtime = ConstructorParameters<typeof GitHubProvider>[2]
  type Updater = ConstructorParameters<typeof GitHubProvider>[1]
  return new GitHubProvider(
    { provider: 'github', owner: 'example', repo: 'desktop-app' },
    { allowPrerelease: false } as Updater,
    { platform: 'win32', executor: { request } as Runtime['executor'], isUseMultipleRangeRequest: false }
  )
}

function capture() {
  const states: UpdateState[] = []
  const info: string[] = []
  const warnings: string[] = []
  const report = createUpdateErrorReporter(
    (state) => states.push(state),
    { info: ({ event }) => { info.push(event) }, warn: ({ event }) => { warnings.push(event) } }
  )
  return { states, info, warnings, report }
}

test('real GitHubProvider empty Atom feed is an informational setup state', async () => {
  // Uses the installed electron-updater provider with fake HTTP, not Electron or the network.
  const provider = providerWith(async () => emptyFeed)
  const { states, info, warnings, report } = capture()
  await performUpdateCheck(() => provider.getLatestVersion(), report)
  assert.deepEqual(states, [{ status: 'not-configured' }])
  assert.deepEqual(info, ['update-feed-not-configured'])
  assert.deepEqual(warnings, [])
})

test('explicit no-published-versions code is recognized', () => {
  assert.equal(isEmptyReleaseFeed(Object.assign(new Error('No versions'), {
    code: 'ERR_UPDATER_NO_PUBLISHED_VERSIONS'
  })), true)
})

test('only the exact missing-entry error is treated as an empty GitHub feed', () => {
  assert.equal(isEmptyReleaseFeed({ code: 'ERR_XML_MISSED_ELEMENT', message: 'No published versions on GitHub' }), true)
  for (const error of [
    { code: 'ERR_XML_MISSED_ELEMENT', message: 'No element "link"' },
    { code: 'ERR_XML_MISSED_ATTRIBUTE', message: 'No published versions on GitHub' },
    { message: 'No published versions on GitHub' }, 'No published versions on GitHub', null, undefined
  ]) assert.equal(isEmptyReleaseFeed(error), false)
})

test('error-event plus promise rejection cannot overwrite the setup state', async () => {
  const error = Object.assign(new Error('No published versions on GitHub'), { code: 'ERR_XML_MISSED_ELEMENT' })
  const emitter = new EventEmitter()
  const { states, warnings, report } = capture()
  emitter.on('error', (value) => report(value, 'update'))
  await performUpdateCheck(async () => { emitter.emit('error', error); throw error }, report)
  assert.deepEqual(states, [{ status: 'not-configured' }, { status: 'not-configured' }])
  assert.deepEqual(warnings, [])
})

test('real provider network failures remain visible update-check errors', async () => {
  const provider = providerWith(async () => { throw Object.assign(new Error('Connection reset'), { code: 'ECONNRESET' }) })
  const { states, warnings, report } = capture()
  await performUpdateCheck(() => provider.getLatestVersion(), report)
  assert.deepEqual(states, [{ status: 'error', message: 'Unable to check for updates. Please try again later.' }])
  assert.deepEqual(warnings, ['update-check-failed'])
})

test('metadata, authorization, malformed feed and generic 404 failures are not hidden', () => {
  for (const error of [
    { code: 'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND' },
    { code: 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND' },
    { code: 'ERR_UPDATER_INVALID_RELEASE_FEED' },
    { code: 'ERR_UPDATER_INVALID_UPDATE_INFO' },
    { statusCode: 404 }, { statusCode: 403 }, { code: 'ETIMEDOUT' },
    new Error('Unexpected failure')
  ]) {
    const { states, info, warnings, report } = capture()
    report(error, 'check')
    assert.equal(states[0].status, 'error')
    assert.deepEqual(info, [])
    assert.equal(warnings.length, 1)
  }
})

test('download errors retain their error state and never include raw exception payloads', () => {
  const { states, warnings, report } = capture()
  report(new Error('private diagnostic details'), 'update')
  assert.deepEqual(states, [{ status: 'error', message: 'The update could not finish. Please try again later.' }])
  assert.deepEqual(warnings, ['update-failed'])
})

test('a later valid release feed still returns available update metadata normally', async () => {
  const feed = '<feed><entry><title>1.1.0</title><link href="https://github.com/example/desktop-app/releases/tag/v1.1.0"/><content>Release notes</content></entry></feed>'
  const requests: string[] = []
  const provider = providerWith(async ({ path = '' }) => {
    requests.push(path)
    if (path.endsWith('.atom')) return feed
    if (path.endsWith('/latest')) return JSON.stringify({ tag_name: 'v1.1.0' })
    if (path.endsWith('/latest.yml')) return 'version: 1.1.0\nfiles: []\n'
    throw new Error('Unexpected fixture request')
  })
  const { states, report } = capture()
  await performUpdateCheck(async () => {
    const result = await provider.getLatestVersion()
    assert.equal(result.version, '1.1.0')
    assert.equal(result.tag, 'v1.1.0')
  }, report)
  assert.deepEqual(states, [])
  assert.equal(requests.length, 3)
})
