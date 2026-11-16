import { test, expect } from '@playwright/test'
import { mockBridge } from './bridge'

test.beforeEach(async ({ page }) => { await mockBridge(page) })

test('home, counter, native dialog mock, toast, routing and unknown routes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your next desktop app starts here.' })).toBeVisible()
  await page.getByRole('button', { name: 'Count is 0' }).click()
  await expect(page.getByRole('button', { name: 'Count is 1' })).toBeVisible()
  await page.getByRole('button', { name: 'Test Native Open Dialog' }).click()
  await expect(page.getByRole('status', { name: '', exact: true }).filter({ hasText: 'Opened: notes.txt' })).toBeVisible()
  await page.getByRole('button', { name: 'Show toast' }).click()
  await expect(page.getByText('Your app is ready to build')).toBeVisible()
  await page.getByRole('button', { name: 'Dismiss notification' }).click()
  await expect(page.getByText('Your app is ready to build')).toHaveCount(0)
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await page.goto('/#/unknown')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('theme selection persists, while system follows OS and native events', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/#/settings')
  await page.getByLabel('Appearance').selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.getByLabel('Appearance')).toHaveValue('dark')
  await page.getByLabel('Appearance').selectOption('system')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.evaluate(() => window.__test.theme(false))
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('main-process notifications and menu commands reach the renderer', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Show toast' })).toBeVisible()
  await page.evaluate(() => { window.__test.toast('Native notification'); window.__test.command('new') })
  await expect(page.getByText('Native notification')).toBeVisible()
  await expect(page.getByText('Menu command: new')).toBeVisible()
})
