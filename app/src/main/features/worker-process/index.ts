import { app, utilityProcess } from 'electron'
import { join } from 'node:path'
import { z } from 'zod'
import { procedure, type FeatureContext, type MainFeature } from '../../feature-host'
import { JobManager } from './manager'
import { jobInput } from './protocol'

export default function workerProcess(context: FeatureContext): MainFeature {
  const manager = new JobManager(() => utilityProcess.fork(
    join(app.getAppPath(), 'out/main/worker-process.cjs'), [],
    { serviceName: 'Bounded prime counter', execArgv: ['--max-old-space-size=64'], stdio: 'ignore' }
  ), job => context.notify('job', job))
  return {
    methods: {
      start: procedure(jobInput, input => ({ id: manager.start(input).id })),
      cancel: procedure(z.object({ id: z.string().uuid() }).strict(), input => manager.cancel(input.id)),
      status: procedure(z.void(), () => manager.snapshot())
    },
    beforeQuit: () => manager.shutdown(),
    shutdown: () => manager.shutdown()
  }
}
