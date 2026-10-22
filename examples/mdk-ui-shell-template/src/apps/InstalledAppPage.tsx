import type { MdkAppRoute } from '@tetherto/mdk-react-adapter'
import { MdkAppProvider, useInstalledAppUis } from '@tetherto/mdk-react-adapter'
import { ErrorBoundary, ErrorCard } from '@tetherto/mdk-react-devkit'
import { useParams, useRoutes } from 'react-router'

import { PageLayout } from '../components/PageLayout'
import NotFound from '../pages/NotFound'
import { toRouterPath } from './paths'

const AppRoutes = ({ routes }: { routes: MdkAppRoute[] }) =>
  useRoutes([
    ...routes.map(({ path, component: Page }) => ({ ...toRouterPath(path), element: <Page /> })),
    { path: '*', element: <NotFound /> },
  ])

/**
 * Renders whichever installed app owns `/app/:appName/*`, with its own routes
 * nested below. Each app renders inside its `MdkAppProvider` (so it can reach
 * its own API) and its own error boundary (so a crash stays inside the app).
 */
const InstalledAppPage = () => {
  const { appName } = useParams()
  const { apps, failures, isLoading } = useInstalledAppUis()

  if (isLoading) return <div className="mdk-ui-shell-loader">Loading…</div>

  const loaded = apps.find(({ app }) => app.name === appName)
  if (!loaded) {
    const failure = failures.find(({ app }) => app.name === appName)
    if (!failure) return <NotFound />
    return (
      <PageLayout title={failure.app.displayName}>
        <ErrorCard title="This app could not be loaded" error={failure.error.message} />
      </PageLayout>
    )
  }

  return (
    <MdkAppProvider app={loaded.app}>
      {/* Keyed by app: moving to another app starts it with a fresh boundary. */}
      <ErrorBoundary key={loaded.app.name} componentName={loaded.app.displayName}>
        <AppRoutes routes={loaded.ui.routes} />
      </ErrorBoundary>
    </MdkAppProvider>
  )
}

export default InstalledAppPage
