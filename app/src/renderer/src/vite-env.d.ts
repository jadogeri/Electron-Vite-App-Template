/// <reference types="vite/client" />

import type { DesktopAPI } from '../../shared/types'
import type { FeatureBridge } from '../../shared/features'

declare global {
  interface Window {
    api: DesktopAPI
    features?: FeatureBridge
  }
}



