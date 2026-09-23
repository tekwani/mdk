/**
 * Canonical reference page for the mdk-ui-shell template. Not routed in a bare
 * shell — copy this file into `src/pages/`, then add its entry to
 * `src/routes.ts` and its icon to `src/constants/navigation.tsx`.
 */
import { useThingDetail } from '@tetherto/mdk-react-adapter'
import {
  ContainerDetail,
  ContainerDetailPlaceholder,
  useExplorerThingDetail,
} from '@tetherto/mdk-react-devkit'
import { CONTAINER_TAB_LABEL } from '@tetherto/mdk-ui-foundation'
import { getSupportedContainerTabs } from '@tetherto/mdk-ui-foundation/presets/mining'
import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import { PageLayout } from '../components/PageLayout'
import {
  buildContainerDetailPath,
  CONTAINER_DETAIL_DEFAULT_TAB,
  ROUTE_PATHS,
} from '../constants/routes'

const ExplorerContainerDetailPage = () => {
  const navigate = useNavigate()
  const { id, tab } = useParams<{ id: string, tab?: string }>()
  const [searchParams] = useSearchParams()
  const backUrl = searchParams.get('backUrl') ?? ROUTE_PATHS.EXPLORER

  // `thing.type` drives the tab strip; the display title comes from the shaped
  // detail hook. Both read the same thing by id, so TanStack dedupes the fetch.
  const { thing, isLoading } = useThingDetail(id)
  const { title } = useExplorerThingDetail(id)

  // Resolve the per-model tab strip from the shared tab matrix (single-site
  // containers only — the MDK carries no multi-container aggregate types).
  const tabs = useMemo(() => {
    if (!thing?.type) return []
    return getSupportedContainerTabs(thing.type).map((key) => ({
      key,
      label: CONTAINER_TAB_LABEL[key],
    }))
  }, [thing?.type])

  const activeTab = tab ?? CONTAINER_DETAIL_DEFAULT_TAB
  const isKnownTab = tabs.some((t) => t.key === activeTab)

  // An absent or unknown `:tab` redirects to the first supported tab (Home),
  // preserving backUrl — mirrors the reference app's container detail behaviour.
  useEffect(() => {
    if (!id || isLoading || tabs.length === 0) return
    if (!tab || !isKnownTab) {
      navigate(buildContainerDetailPath(id, tabs[0]!.key, backUrl), { replace: true })
    }
  }, [id, isLoading, tabs, tab, isKnownTab, backUrl, navigate])

  const activeLabel = tabs.find((t) => t.key === activeTab)?.label ?? activeTab

  // `useExplorerThingDetail` falls back to the raw id (a UUID) until the thing
  // resolves; show a neutral heading in that window rather than flashing it.
  const heading = title && title !== id ? title : 'Container'

  return (
    <PageLayout title={heading} className="mdk-ui-shell-explorer-detail">
      <ContainerDetail
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(next) => navigate(buildContainerDetailPath(id!, next, backUrl))}
        onBack={() => navigate(backUrl)}
      >
        <ContainerDetailPlaceholder label={activeLabel} />
      </ContainerDetail>
    </PageLayout>
  )
}

export default ExplorerContainerDetailPage
