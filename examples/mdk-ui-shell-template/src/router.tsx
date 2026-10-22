import { RequireAuth } from '@tetherto/mdk-react-devkit'
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'

import { App } from './App'
import { APP_PAGES_ROUTE } from './apps/paths'
import { AUTH_BYPASS } from './constants/env'
import { ROUTE_PATHS } from './constants/routes'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import SignIn from './pages/SignIn'
import { ROUTES } from './routes'

// Installed apps' pages: one route for all of them, resolved at runtime from
// the app list this dashboard serves (/app-ui.json) — so installing an app
// needs no change here.
const InstalledAppPage = lazy(() => import('./apps/InstalledAppPage'))

export const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.SIGN_IN,
    element: <SignIn />,
  },
  {
    path: '/',
    // AUTH_BYPASS (dev): render the app directly, skipping the sign-in gate.
    element: AUTH_BYPASS
      ? <App />
      : (
          <RequireAuth fallback={<Navigate to={ROUTE_PATHS.SIGN_IN} replace />}>
            <App />
          </RequireAuth>
        ),
    children: [
      { index: true, element: <Navigate to={ROUTE_PATHS.HOME} replace /> },
      {
        path: ROUTE_PATHS.HOME.replace(/^\//, ''),
        element: <Home />,
      },
      // Feature pages come from `./routes`; deep-link params (e.g. Alerts'
      // `/:uuid?`) come from each route's `routePath`.
      ...ROUTES.map((route) => {
        const Page = lazy(route.page)
        return {
          path: (route.routePath ?? route.path).replace(/^\//, ''),
          element: (
            <Suspense fallback={<div className="mdk-ui-shell-loader">Loading…</div>}>
              <Page />
            </Suspense>
          ),
        }
      }),
      {
        path: APP_PAGES_ROUTE,
        element: (
          <Suspense fallback={<div className="mdk-ui-shell-loader">Loading…</div>}>
            <InstalledAppPage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
