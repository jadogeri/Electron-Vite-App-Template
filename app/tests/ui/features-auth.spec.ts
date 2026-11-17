import { test, expect, type Page } from '@playwright/test'
import type { FeatureBridge } from '../../src/shared/features'
import { mockBridge } from './bridge'

type AuthStatus = {
  configured: boolean
  state: 'disabled' | 'signed-out' | 'signing-in' | 'signed-in'
  error?: 'configuration' | 'provider' | 'storage' | 'expired'
  expiresAt?: number
}
type Call = { feature: string; method: string; input?: unknown }
declare global {
  interface Window {
    __authTest: {
      publish(value: AuthStatus): void
      calls: Call[]
      listeners(): number
      failNext: boolean
      holdSignIn: boolean
      releaseSignIn(): void
      current(): AuthStatus
    }
  }
}

async function authBridge(page: Page, initial: AuthStatus) {
  await mockBridge(page)
  await page.addInitScript(initialStatus => {
    let status = { ...initialStatus }
    const callbacks = new Set<(value: unknown) => void>()
    let release: () => void = () => {}
    const publish = (value: AuthStatus) => {
      status = { ...value }
      callbacks.forEach(callback => callback({ ...status }))
    }
    window.__authTest = {
      publish, calls: [], listeners: () => callbacks.size, failNext: false,
      holdSignIn: false, releaseSignIn: () => release(), current: () => ({ ...status })
    }
    const bridge: FeatureBridge = {
      list: async () => ['auth-security'],
      call: async <T,>(feature: string, method: string, input?: unknown): Promise<T> => {
        window.__authTest.calls.push({ feature, method, ...(input === undefined ? {} : { input }) })
        if (feature !== 'auth-security' || !['status', 'signIn', 'cancel', 'signOut'].includes(method)) {
          throw new Error('Unregistered account action')
        }
        // Failure injection targets user actions, never the asynchronous mount read.
        if (window.__authTest.failNext && method !== 'status') {
          window.__authTest.failNext = false
          throw new Error('synthetic-private-access-token synthetic-private-refresh-token')
        }
        if (method === 'signIn') {
          if (window.__authTest.holdSignIn) {
            await new Promise<void>(resolve => { release = resolve })
            window.__authTest.holdSignIn = false
          }
          publish({ configured: true, state: 'signing-in' })
        }
        if (method === 'cancel' || method === 'signOut') publish({ configured: true, state: 'signed-out' })
        return { ...status } as T
      },
      on: (feature, event, callback) => {
        if (feature !== 'auth-security' || event !== 'status') return () => {}
        callbacks.add(callback)
        return () => { callbacks.delete(callback) }
      }
    }
    // Avoid redefining the production Window declaration when core integration adds it.
    ;(window as unknown as { features: FeatureBridge }).features = bridge
  }, initial)
}
const account = (page: Page) => page.getByRole('region', { name: 'Account security' })
async function openSettings(page: Page) {
  await page.goto('/#/settings')
  await expect(account(page)).toBeVisible()
  // Region visibility precedes the initial bridge response. Wait for that response
  // before mutating fixture flags or asserting action controls.
  await expect(account(page).getByRole('status')).not.toHaveText('Loading account status…')
}
async function assertPrivateBoundary(page: Page) {
  const html = await account(page).evaluate(element => element.outerHTML)
  for (const value of [
    'synthetic-private-access-token', 'synthetic-private-refresh-token',
    'synthetic-event-access', 'synthetic-event-refresh'
  ]) expect(html).not.toContain(value)
  await expect(account(page).locator('input[type="password"], input[name*="token"], [data-token]')).toHaveCount(0)
  const boundary = await page.evaluate(() => {
    const features = (window as unknown as { features: FeatureBridge }).features
    return { keys: Object.keys(features).sort(), calls: window.__authTest.calls }
  })
  expect(boundary.keys).toEqual(['call', 'list', 'on'])
  for (const call of boundary.calls) {
    expect(call.feature).toBe('auth-security')
    expect(['status', 'signIn', 'cancel', 'signOut']).toContain(call.method)
    expect(call).not.toHaveProperty('input')
  }
}

test('unconfigured account is disabled without credential fields or sign-in actions', async ({ page }) => {
  await authBridge(page, { configured: false, state: 'disabled' })
  await openSettings(page)
  await expect(account(page).getByRole('status')).toHaveText('Sign-in is not configured for this app.')
  await expect(account(page).getByRole('button')).toHaveCount(0)
  await assertPrivateBoundary(page)
})

test('sign-in can be started and cancelled with the keyboard, leaving a retryable signed-out state', async ({ page }) => {
  await authBridge(page, { configured: true, state: 'signed-out' })
  await openSettings(page)
  const signIn = account(page).getByRole('button', { name: 'Sign in with browser' })
  await expect(signIn).toBeEnabled()
  await signIn.focus()
  await page.keyboard.press('Enter')
  await expect(account(page).getByRole('status')).toHaveText('Complete sign-in in your system browser.')
  await expect(signIn).toHaveCount(0)
  const cancel = account(page).getByRole('button', { name: 'Cancel sign-in' })
  await expect(cancel).toBeEnabled()
  await cancel.focus()
  await page.keyboard.press('Enter')
  await expect(account(page).getByRole('status')).toHaveText('Signed out.')
  await expect(signIn).toBeEnabled()
  expect(await page.evaluate(() => window.__authTest.calls.filter(call => call.method !== 'status').map(call => call.method)))
    .toEqual(['signIn', 'cancel'])
  await assertPrivateBoundary(page)
})

test('pending bridge request disables duplicate sign-ins until the browser flow starts', async ({ page }) => {
  await authBridge(page, { configured: true, state: 'signed-out' })
  await openSettings(page)
  await page.evaluate(() => { window.__authTest.holdSignIn = true })
  const signIn = account(page).getByRole('button', { name: 'Sign in with browser' })
  await signIn.click()
  await expect(signIn).toBeDisabled()
  expect(await page.evaluate(() => window.__authTest.calls.filter(call => call.method === 'signIn').length)).toBe(1)
  await page.evaluate(() => window.__authTest.releaseSignIn())
  await expect(account(page).getByRole('button', { name: 'Cancel sign-in' })).toBeEnabled()
  await assertPrivateBoundary(page)
})

test('authenticated events display safe status only and sign-out restores sign-in controls', async ({ page }) => {
  await authBridge(page, { configured: true, state: 'signing-in' })
  await openSettings(page)
  await expect(account(page).getByRole('button', { name: 'Cancel sign-in' })).toBeEnabled()
  await page.evaluate(() => {
    const synthetic = {
      configured: true, state: 'signed-in' as const, expiresAt: Date.now() + 600_000,
      // Defense in depth: even unexpected extra fields cannot become rendered content.
      accessToken: 'synthetic-event-access', refreshToken: 'synthetic-event-refresh'
    }
    window.__authTest.publish(synthetic)
  })
  await expect(account(page).getByRole('status')).toHaveText('Signed in. Credentials are protected by the operating system.')
  await expect(account(page).getByText('Session expires:', { exact: false })).toBeVisible()
  await expect(account(page).getByRole('button', { name: 'Cancel sign-in' })).toHaveCount(0)
  await assertPrivateBoundary(page)
  await account(page).getByRole('button', { name: 'Sign out and clear credentials' }).click()
  await expect(account(page).getByRole('status')).toHaveText('Signed out.')
  await expect(account(page).getByRole('button', { name: 'Sign in with browser' })).toBeEnabled()
  await expect(account(page).getByText('Session expires:', { exact: false })).toHaveCount(0)
  await assertPrivateBoundary(page)
})

test('failed sign-in shows only a safe error and enables retry', async ({ page }) => {
  await authBridge(page, { configured: true, state: 'signed-out' })
  await openSettings(page)
  await page.evaluate(() => { window.__authTest.failNext = true })
  const signIn = account(page).getByRole('button', { name: 'Sign in with browser' })
  await signIn.click()
  await expect(account(page).getByRole('alert')).toHaveText('Account action failed. Try again.')
  await expect(signIn).toBeEnabled()
  await assertPrivateBoundary(page)
  await signIn.click()
  await expect(account(page).getByRole('button', { name: 'Cancel sign-in' })).toBeEnabled()
  await expect(account(page).getByRole('alert')).toHaveCount(0)
})

test('secure-storage failure explains the blocker and offers credential-clear retry', async ({ page }) => {
  await authBridge(page, { configured: true, state: 'signed-out', error: 'storage' })
  await openSettings(page)
  await expect(account(page).getByRole('alert')).toContainText('Secure credential storage is unavailable.')
  await expect(account(page).getByRole('button', { name: 'Sign out and clear credentials' })).toBeEnabled()
  await account(page).getByRole('button', { name: 'Sign out and clear credentials' }).click()
  await expect(account(page).getByRole('alert')).toHaveCount(0)
  await assertPrivateBoundary(page)
})

test('account status listener is cleaned up when leaving settings and restored on return', async ({ page }) => {
  await authBridge(page, { configured: true, state: 'signed-out' })
  await openSettings(page)
  await expect.poll(() => page.evaluate(() => window.__authTest.listeners())).toBe(1)
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(account(page)).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => window.__authTest.listeners())).toBe(0)
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await expect(account(page)).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.__authTest.listeners())).toBe(1)
})
