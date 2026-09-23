import { useTokenPolling } from '@tetherto/mdk-react-adapter'
import { AppHeader, MdkWordmark, Sidebar } from '@tetherto/mdk-react-devkit'
import { CoPilot } from '@tetherto/mdk-ui-agent'
import { useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { UserMenu } from './components/UserMenu'
import { AUTH_BYPASS } from './constants/env'
import { getNavIcon } from './constants/navigation'
import { ROUTE_PATHS } from './constants/routes'
import { ROUTES } from './routes'

import './App.scss'

// The sidebar is derived from the ROUTES registry — the single source of truth
// for feature pages. A bare shell only shows Home; each added page appears here
// automatically (hidden deep-link routes are skipped).

export const App = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Keeps the session token fresh; clears it on a 401 / 500 and bounces back
  // to /signin via `onSessionEnded`. Disabled under AUTH_BYPASS so the stub
  // session is never torn down against a missing OAuth backend.
  useTokenPolling({
    enabled: AUTH_BYPASS ? false : undefined,
    onSessionEnded: () => {
      void navigate(ROUTE_PATHS.SIGN_IN, { replace: true })
    },
  })

  const sidebarItems = useMemo(
    () => [
      { id: ROUTE_PATHS.HOME, label: 'Home', icon: getNavIcon(ROUTE_PATHS.HOME) },
      ...ROUTES.filter((route) => !route.hidden).map((route) => ({
        id: route.path,
        label: route.label,
        icon: getNavIcon(route.path),
      })),
    ],
    [],
  )

  return (
    <div className="mdk-ui-shell-root">
      <AppHeader
        logo={<MdkWordmark size="md" />}
        actions={
          <UserMenu
            onSignOut={() => {
              void navigate(ROUTE_PATHS.SIGN_IN, { replace: true })
            }}
          />
        }
      />

      <div className="mdk-ui-shell-content">
        <Sidebar
          items={sidebarItems}
          activeId={location.pathname + location.search}
          onItemClick={(item) => {
            void navigate(item.id)
          }}
          defaultExpanded
        />

        <div className="mdk-ui-shell-outlet">
          <main className="mdk-ui-shell-main">
            <Outlet />
          </main>
        </div>
      </div>

      {/*
        The operator co-pilot. Mounted once here rather than on a route, so it
        stays available whichever page is showing — it answers about the fleet,
        not about the page. Delete this line to remove it.

        It needs the Gateway's `/agent/*` routes, which the agent plugin serves:
        add `@tetherto/mdk-plugin-agent` to your stack's `mdk.yaml`. Without it
        the panel opens and reports that the agent is not configured.
      */}
      <CoPilot />
    </div>
  )
}

export default App
