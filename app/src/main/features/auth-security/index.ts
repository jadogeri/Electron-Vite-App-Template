import { app, safeStorage, shell } from 'electron'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { AuthController } from './core'
import { OidcProvider, readConfig } from './provider'
import { EncryptedVault } from './vault'

export default async function authSecurity(context: FeatureContext): Promise<MainFeature> {
  let configurationFailed = false
  let provider: OidcProvider | null = null
  try {
    const config = readConfig(process.env)
    if (config) provider = new OidcProvider(config)
  } catch { configurationFailed = true }
  const controller = new AuthController(
    provider, new EncryptedVault(app.getPath('userData'), safeStorage),
    async url => { await shell.openExternal(url) },
    status => context.notify('status', status)
  )
  await controller.initialize()
  const status = () => configurationFailed
    ? { configured: false, state: 'disabled' as const, error: 'configuration' as const }
    : controller.status()
  return {
    methods: {
      status: procedure(z.void(), status),
      signIn: procedure(z.void(), async () => configurationFailed ? status() : controller.signIn()),
      cancel: procedure(z.void(), () => controller.cancel()),
      signOut: procedure(z.void(), () => controller.signOut())
    },
    onProtocol: url => controller.onProtocol(url),
    shutdown: () => controller.shutdown()
  }
}
