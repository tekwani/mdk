/**
 * Canonical reference page for the mdk-ui-shell template. Not routed in a bare
 * shell — copy this file into `src/pages/`, then add its entry to
 * `src/routes.ts` and its icon to `src/constants/navigation.tsx`.
 */
import { ContainerWidgets, useContainerWidgetsData } from '@tetherto/mdk-react-devkit'
import { useNavigate } from 'react-router'

import { PageLayout } from '../components/PageLayout'
import { buildContainerDetailPath, ROUTE_PATHS } from '../constants/routes'

const SiteOverviewPage = () => {
  const { containers, isLoading, errorMessage } = useContainerWidgetsData()
  const navigate = useNavigate()

  // Clicking a container card deep-links to its detail page, with a backUrl so
  // the detail page's Back link returns here to Site Overview.
  const handleContainerClick = (id: string): void => {
    navigate(buildContainerDetailPath(id, 'home', ROUTE_PATHS.SITE_OVERVIEW))
  }

  return (
    <PageLayout title="Site Overview">
      <ContainerWidgets
        containers={containers}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onContainerClick={handleContainerClick}
      />
    </PageLayout>
  )
}

export default SiteOverviewPage
