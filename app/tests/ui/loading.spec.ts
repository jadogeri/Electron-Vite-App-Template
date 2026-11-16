import { test, expect } from '@playwright/test'
import { mockBridge } from './bridge'

test('startup displays animated loading UI until initialization completes', async ({ page }) => {
  await mockBridge(page, { slow: true })
  await page.goto('/')
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByText('Preparing your workspace')).toBeVisible()
  await expect(page.locator('.spinner')).toHaveCSS('animation-name', 'spin')
  await expect(page.locator('.skeleton')).toHaveCSS('animation-name', 'shimmer')
  await page.evaluate(() => window.__test.release())
  await expect(page.getByRole('heading', { name: 'Your next desktop app starts here.' })).toBeVisible()
  await expect(page.locator('.loading-screen')).toHaveCount(0)
})

test('reduced motion disables loading effects', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockBridge(page, { slow: true })
  await page.goto('/')
  await expect(page.locator('.spinner')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.skeleton')).toHaveCSS('animation-name', 'none')
})

test('initialization rejection shows an actionable fallback', async ({ page }) => {
  await mockBridge(page, { fail: true })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Unable to start')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

test('a plain browser cannot silently impersonate the desktop bridge', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Desktop bridge unavailable' })).toBeVisible()
})

test('render-time exceptions are caught by the React error boundary', async ({ page }) => {
  await mockBridge(page)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Show toast' })).toBeVisible()
  // Deliberately violate the runtime payload to trigger React's invalid-child exception.
  await page.evaluate(() => window.__test.update({
    status: 'error', message: { invalid: true }
  } as unknown as import('../../src/shared/types').UpdateState))
  await expect(page.getByRole('alert')).toContainText('Something went wrong')
  await expect(page.getByRole('button', { name: 'Reload application' })).toBeVisible()
})
