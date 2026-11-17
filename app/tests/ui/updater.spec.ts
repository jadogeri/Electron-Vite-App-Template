import { test, expect } from '@playwright/test'
import { mockBridge, emitUpdate } from './bridge'

test.beforeEach(async ({ page }) => {
  await mockBridge(page)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Show toast' })).toBeVisible()
})

test('checking, available, download progress and restart-to-install UI', async ({ page }) => {
  await emitUpdate(page, { status: 'checking' })
  const banner = page.getByRole('region', { name: 'Application updates' })
  await expect(banner).toContainText('Checking for updates')
  await expect(banner.locator('.spinner')).toHaveCSS('animation-name', 'spin')
  await emitUpdate(page, { status: 'available', version: '1.1.0' })
  await expect(banner).toContainText('Preparing download')
  await emitUpdate(page, { status: 'downloading', percent: 42 })
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '42')
  await expect(banner).toContainText('42%')
  await emitUpdate(page, { status: 'downloaded', version: '1.1.0' })
  await page.getByRole('button', { name: 'Restart & Install' }).click()
  await expect(banner).toContainText('Restarting to install')
  await expect(page.getByRole('button', { name: 'Restarting…' })).toBeDisabled()
  expect(await page.evaluate(() => window.__test.installs)).toBe(1)
  await emitUpdate(page, { status: 'installing' })
  await expect(banner).toHaveAttribute('aria-busy', 'true')
})

test('failed install is recoverable and never claims completion', async ({ page }) => {
  await emitUpdate(page, { status: 'downloaded', version: '1.2.0' })
  await page.evaluate(() => { window.__test.rejectInstall = true })
  await page.getByRole('button', { name: 'Restart & Install' }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to restart')
  await expect(page.getByRole('button', { name: 'Restart & Install' })).toBeEnabled()
  await page.evaluate(() => { window.__test.rejectInstall = false })
  await page.getByRole('button', { name: 'Restart & Install' }).click()
  expect(await page.evaluate(() => window.__test.installs)).toBe(2)
})

test('download progress is clamped and error text is safely escaped', async ({ page }) => {
  await emitUpdate(page, { status: 'downloading', percent: 120 })
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '100')
  await emitUpdate(page, { status: 'error', message: '<script>bad()</script>' })
  await expect(page.getByRole('alert')).toHaveText('<script>bad()</script>')
  await expect(page.locator('.update-banner script')).toHaveCount(0)
})

test('settings check button reports an up-to-date result', async ({ page }) => {
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click()
  await expect(page.getByText('You are up to date.')).toBeVisible()
})

test('empty release feed displays setup information, not an error or false up-to-date claim', async ({ page }) => {
  await emitUpdate(page, { status: 'checking' })
  await emitUpdate(page, { status: 'not-configured' })
  const banner = page.getByRole('region', { name: 'Application updates' })
  await expect(banner.getByRole('status')).toHaveText("Updates haven't been set up yet. No release has been published.")
  await expect(banner).toHaveAttribute('aria-busy', 'false')
  await expect(banner.getByRole('alert')).toHaveCount(0)
  await expect(banner.locator('.spinner')).toHaveCount(0)
  await expect(banner.getByRole('progressbar')).toHaveCount(0)
  await expect(banner.getByRole('button')).toHaveCount(0)
  await expect(banner).not.toContainText('You are up to date')
})

test('manual check can move from setup state to a real update without restarting', async ({ page }) => {
  await emitUpdate(page, { status: 'not-configured' })
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.evaluate(() => { window.__test.checkResult = { status: 'downloading', percent: 20 } })
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '20')
  await expect(page.getByText("Updates haven't been set up yet.", { exact: false })).toHaveCount(0)
})

test('manual check still displays real failures after a setup-only result', async ({ page }) => {
  await emitUpdate(page, { status: 'not-configured' })
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.evaluate(() => {
    window.__test.checkResult = { status: 'error', message: 'Unable to check for updates. Please try again later.' }
  })
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Unable to check for updates. Please try again later.')
})
