import { app } from 'electron'
import Store from 'electron-store'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { setMainTranslator } from '../../localization'
import { createTranslations, normalizeLocale, textTranslator, type LocaleState } from './resources'

const preferenceSchema = z.enum(['system', 'en', 'es'])
export default async function localization(context: FeatureContext): Promise<MainFeature> {
  const store = new Store({ name: 'preferences' })
  const preference = preferenceSchema.catch('system').parse(store.get('localePreference'))
  let state: LocaleState = { preference, locale: normalizeLocale(preference === 'system' ? app.getLocale() : preference) }
  const instance = await createTranslations(state.locale)
  setMainTranslator(textTranslator(instance))
  return { methods: {
    getState: procedure(z.void(), () => state),
    setPreference: procedure(preferenceSchema, async preference => {
      store.set('localePreference', preference)
      state = { preference, locale: normalizeLocale(preference === 'system' ? app.getLocale() : preference) }
      await instance.changeLanguage(state.locale)
      setMainTranslator(textTranslator(instance))
      context.refreshMenus()
      context.notify('changed', state)
      return state
    })
  } }
}
