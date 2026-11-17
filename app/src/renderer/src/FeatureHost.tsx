import { useEffect, useState, type ComponentType } from 'react'
import type { FeatureBridge, FeatureId } from '../../shared/features'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useTranslate } from './localization'
type Placement = 'tools' | 'settings' | 'global' | 'titlebar'
type Plugin = { default: ComponentType<{ bridge: FeatureBridge }>; placement?: Placement }
const modules = import.meta.glob<Plugin>('./features/*/index.tsx', { eager: true })
export function useRegisteredFeatures() {
  const [ids, setIds] = useState<FeatureId[]>([])
  useEffect(() => {
    let active = true
    void window.features?.list().then(list => { if (active) setIds(list) }).catch(() => {})
    return () => { active = false }
  }, [])
  return ids
}
export function FeatureSlot({ placement, ids }: { placement: Placement; ids: FeatureId[] }) {
  const t = useTranslate()
  const bridge = window.features
  if (!bridge) return null
  return <>{ids.map(id => {
    const module = modules[`./features/${id}/index.tsx`]
    if (!module || (module.placement || 'tools') !== placement) return null
    const View = module.default
    return <ErrorBoundary key={id}><section aria-label={t('Feature: {{name}}', { name: id })} data-feature={id}><View bridge={bridge} /></section></ErrorBoundary>
  })}</>
}
