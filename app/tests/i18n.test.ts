import { test } from 'node:test'
import assert from 'node:assert/strict'
import { en, es, createTranslations, normalizeLocale, textTranslator, formatNumber, formatDate } from '../src/main/features/i18n/resources'

test('OS tags normalize and unsupported/invalid tags fall back', () => {
  for (const locale of ['es-MX', 'es_ES', 'es-419', 'ES-ar']) assert.equal(normalizeLocale(locale), 'es')
  for (const locale of ['en-GB', 'fr-FR', '', '../../secret']) assert.equal(normalizeLocale(locale), 'en')
})
test('Spanish resources are complete, nonblank and preserve interpolation names', () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort())
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    assert.ok(es[key].trim(), key)
    assert.deepEqual(es[key].match(/\{\{\w+\}\}/g), en[key].match(/\{\{\w+\}\}/g), key)
  }
})
test('real i18next changes locale and escapes raw HTML interpolation', async () => {
  const i18n = await createTranslations('es')
  assert.equal(i18n.t('Home'), 'Inicio')
  assert.equal(i18n.t('missing English fallback'), 'missing English fallback')
  assert.match(i18n.t('Version {{version}} is ready to install.', { version: '<script>' }), /&lt;script&gt;/)
  assert.match(textTranslator(i18n)('Version {{version}} is ready to install.', { version: '<script>' }), /<script>/)
  await i18n.changeLanguage('en')
  assert.equal(i18n.t('Home'), 'Home')
})
test('number and date formatters use selected locale', () => {
  assert.notEqual(formatNumber('es', 1234.5), formatNumber('en', 1234.5))
  assert.notEqual(formatDate('es', new Date('2026-01-23T12:00Z')), formatDate('en', new Date('2026-01-23T12:00Z')))
})
