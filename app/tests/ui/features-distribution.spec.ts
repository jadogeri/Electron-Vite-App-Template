import { test, expect, type Page } from '@playwright/test'
import type { FeatureBridge, FeatureId } from '../../src/shared/features'
import { mockBridge } from './bridge'

interface FeatureCall { feature: FeatureId; method: string; input: unknown }
declare global {
  interface Window { __distributionCalls: FeatureCall[] }
}

// This fake implements the real bridge contract and persists *fake* preferences
// in browser storage. It proves renderer integration, not Electron/native storage.
async function mockDistribution(page: Page) {
  await mockBridge(page)
  await page.addInitScript(() => {
    const calls: FeatureCall[] = []
    window.__distributionCalls = calls
    const listeners = new Map<string, Set<(value: unknown) => void>>()
    const defaults: Record<string, unknown> = {
      i18n: { preference: 'system', locale: 'en' },
      'telemetry-sentry': { version: 1, enabled: false, configured: true },
      'code-signing': { channel: 'latest', prereleaseConsent: false }
    }
    function read(feature: FeatureId): unknown {
      const saved = localStorage.getItem(`distribution:${feature}`)
      return saved ? JSON.parse(saved) : defaults[feature]
    }
    function save(feature: FeatureId, state: unknown) {
      localStorage.setItem(`distribution:${feature}`, JSON.stringify(state))
      listeners.get(`${feature}:changed`)?.forEach(listener => listener(state))
      return state
    }
    const bridge: FeatureBridge = {
      list: async () => ['i18n', 'code-signing', 'telemetry-sentry'],
      on(feature, event, callback) {
        const key = `${feature}:${event}`
        const set = listeners.get(key) ?? new Set()
        set.add(callback); listeners.set(key, set)
        return () => { set.delete(callback) }
      },
      async call<T>(feature: FeatureId, method: string, input?: unknown): Promise<T> {
        calls.push({ feature, method, input: input ?? null })
        if (method === 'getState') return read(feature) as T
        if (feature === 'i18n' && method === 'setPreference') {
          if (!['en', 'es', 'system'].includes(String(input))) throw new Error('Invalid locale')
          return save(feature, { preference: input, locale: input === 'system' ? 'en' : input }) as T
        }
        if (feature === 'telemetry-sentry' && method === 'setConsent') {
          const consent = input as { version: number; enabled: boolean }
          if (consent.version !== 1 || typeof consent.enabled !== 'boolean') throw new Error('Invalid consent')
          return save(feature, { ...consent, configured: true }) as T
        }
        if (feature === 'code-signing' && method === 'setChannel') {
          const value = input as { channel: string; prereleaseConsent: boolean }
          if (!['latest', 'beta', 'alpha'].includes(value.channel) ||
            (value.channel !== 'latest' && !value.prereleaseConsent)) throw new Error('Consent required')
          return save(feature, value) as T
        }
        throw new Error('Unexpected feature call')
      }
    }
    Object.assign(window, { features: bridge })
  })
}
test.beforeEach(async ({ page }) => { await mockDistribution(page) })

test('Spanish updates core navigation/headings and fake preference survives reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your next desktop app starts here.', exact: true })).toBeVisible()
  await page.locator('#feature-language').selectOption('es')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('heading', { name: 'Tu próxima aplicación de escritorio empieza aquí.', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Inicio', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Configuración', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Configuración', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('#feature-language')).toHaveValue('es')
  await expect(page.getByRole('heading', { name: 'Configuración', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await page.getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tu próxima aplicación de escritorio empieza aquí.', exact: true })).toBeVisible()
})

test('telemetry is opt-in and sends versioned consent DTOs without a report', async ({ page }) => {
  await page.goto('/#/settings')
  const consent = page.getByRole('checkbox', { name: 'Allow anonymous error-category reports' })
  await expect(consent).toBeEnabled()
  await expect(consent).not.toBeChecked()
  await expect(page.getByText('No reporting endpoint is configured. No reports will be sent.')).toHaveCount(0)
  expect(await page.evaluate(() => window.__distributionCalls.filter(call => call.feature === 'telemetry-sentry' && call.method !== 'getState'))).toEqual([])
  await consent.check()
  await expect(consent).toBeChecked()
  await expect(consent).toBeEnabled()
  await consent.uncheck()
  await expect(consent).not.toBeChecked()
  await expect(consent).toBeEnabled()
  expect(await page.evaluate(() => window.__distributionCalls.filter(call => call.feature === 'telemetry-sentry' && call.method !== 'getState'))).toEqual([
    { feature: 'telemetry-sentry', method: 'setConsent', input: { version: 1, enabled: true } },
    { feature: 'telemetry-sentry', method: 'setConsent', input: { version: 1, enabled: false } }
  ])
  await page.reload()
  await expect(consent).toBeEnabled()
  await expect(consent).not.toBeChecked()
})

test('beta requires explicit prerelease consent and stable return does not promise downgrade', async ({ page }) => {
  await page.goto('/#/settings')
  const channel = page.getByLabel('Release channel', { exact: true })
  const consent = page.getByRole('checkbox', { name: 'I accept potentially unstable prerelease versions' })
  const save = page.getByRole('button', { name: 'Save update channel' })
  await expect(channel).toBeEnabled()
  await expect(channel).toHaveValue('latest')
  await expect(consent).not.toBeChecked()
  await channel.selectOption('beta')
  await expect(save).toBeDisabled()
  expect(await page.evaluate(() => window.__distributionCalls.filter(call => call.method === 'setChannel'))).toEqual([])
  await consent.check()
  await expect(save).toBeEnabled()
  await save.click()
  await expect(page.getByText('Current channel: beta.', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => window.__distributionCalls.filter(call => call.method === 'setChannel'))).toEqual([
    { feature: 'code-signing', method: 'setChannel', input: { channel: 'beta', prereleaseConsent: true } }
  ])
  await page.reload()
  await expect(channel).toHaveValue('beta')
  await expect(consent).toBeChecked()
  await expect(channel).toBeEnabled()
  await channel.selectOption('latest')
  await consent.uncheck()
  await save.click()
  await expect(page.getByText('Current channel: latest.', { exact: false })).toBeVisible()
  await expect(page.getByText('Returning to stable never installs an older version; wait for a newer stable release.', { exact: false })).toBeVisible()
})
