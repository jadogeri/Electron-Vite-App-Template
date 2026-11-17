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
test('core integration keys translate including accessibility labels and feature names', async () => {
  const i18n = await createTranslations('es')
  const t = textTranslator(i18n)
  assert.equal(t('Features'), 'Funciones')
  assert.equal(t('Feature: {{name}}', { name: 'i18n' }), 'Función: i18n')
  assert.equal(t('Dismiss notification'), 'Cerrar aviso')
  assert.equal(t('Commands'), 'Comandos')
  assert.equal(t('File opened successfully'), 'Archivo abierto correctamente')
  assert.equal(t('Display process stopped'), 'El proceso de visualización se detuvo')
  assert.equal(t('The application display stopped unexpectedly.'), 'La interfaz de la aplicación se detuvo inesperadamente.')
  assert.equal(t('Reload the window to recover, or close the application.'), 'Recarga la ventana para recuperarla o cierra la aplicación.')
  assert.equal(t('Reload'), 'Recargar')
  assert.equal(t('Close'), 'Cerrar')
  assert.equal(t('Something went wrong'), 'Algo salió mal')
  assert.equal(t('Reload application'), 'Recargar la aplicación')
  assert.equal(t('Menu command: {{command}}', { command: 'open' }), 'Comando del menú: open')
  assert.equal(t('Opened: {{name}}', { name: 'file.txt' }), 'Abierto: file.txt')
  assert.equal(t('Count is {{count}}', { count: 12 }), 'El contador es 12')
  assert.equal(t('Version {{version}} · Secure preload bridge connected', { version: '1.2.3' }), 'Versión 1.2.3 · Puente de precarga seguro conectado')
  assert.equal(t('Version {{version}} found. Preparing download…', { version: '2.0' }), 'Versión 2.0 encontrada. Preparando la descarga…')
  assert.equal(t('Downloading update: {{percent}}%', { percent: '12,5' }), 'Descargando actualización: 12,5%')
  assert.equal(t('Version {{version}} is ready to install.', { version: '2.0' }), 'La versión 2.0 está lista para instalar.')
})
