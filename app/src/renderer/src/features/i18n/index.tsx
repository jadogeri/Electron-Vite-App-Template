import { useEffect, useState } from 'react'
import { I18nextProvider, useTranslation } from 'react-i18next'
import type { i18n } from 'i18next'
import type { FeatureBridge } from '../../../../shared/features'
import { resetTranslator, setTranslator } from '../../localization'
import { createTranslations, textTranslator, type LocalePreference, type LocaleState } from '../../../../main/features/i18n/resources'
export const placement = 'global' as const
function Selector({ instance, state, save }: { instance: i18n; state: LocaleState; save: (v: LocalePreference) => void }) {
  const { t } = useTranslation()
  return <aside aria-label={t('Language')} style={{ padding: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
    <label htmlFor="feature-language">{t('Language')}</label>
    <select id="feature-language" value={state.preference} onChange={e => save(e.target.value as LocalePreference)}>
      <option value="system">{t('Follow operating system')}</option><option value="en">English</option><option value="es">Español</option>
    </select><span lang={instance.language}>{state.locale.toUpperCase()}</span>
  </aside>
}
export default function Language({ bridge }: { bridge: FeatureBridge }) {
  const [state, setState] = useState<LocaleState>({ preference: 'system', locale: 'en' })
  const [instance, setInstance] = useState<i18n>()
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    let revision = 0
    async function apply(next: LocaleState) {
      const current = ++revision
      const translations = await createTranslations(next.locale)
      if (!active || current !== revision) return
      setTranslator(textTranslator(translations))
      document.documentElement.lang = next.locale
      document.documentElement.dir = 'ltr'
      setState(next); setInstance(translations)
    }
    let received = false
    const off = bridge.on('i18n', 'changed', value => { received = true; void apply(value as LocaleState) })
    void bridge.call<LocaleState>('i18n', 'getState').then(value => { if (!received) void apply(value) }).catch(() => { if (active) setError(true) })
    return () => { active = false; off(); resetTranslator() }
  }, [bridge])
  async function save(preference: LocalePreference) {
    setError(false)
    try { await bridge.call('i18n', 'setPreference', preference) } catch { setError(true) }
  }
  return <><div>{instance && <I18nextProvider i18n={instance}><Selector instance={instance} state={state} save={v => { void save(v) }} /></I18nextProvider>}</div>
    {error && <p role="alert">{instance?.t('Unable to save language') ?? 'Unable to save language'}</p>}</>
}
