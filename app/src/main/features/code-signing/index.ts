import Store from 'electron-store'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { changeUpdateChannel, channelPreferenceSchema, getChannelPreference, initializeUpdateChannels } from './channels'
export default function distribution(context: FeatureContext): MainFeature {
  const store = new Store({ name: 'preferences' })
  initializeUpdateChannels(store.get('updateChannel'))
  return { methods: {
    getState: procedure(z.void(), getChannelPreference),
    setChannel: procedure(channelPreferenceSchema, value => {
      const state = changeUpdateChannel(value, next => store.set('updateChannel', next))
      context.notify('changed', state)
      return state
    })
  } }
}
