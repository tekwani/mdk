// The app's UI entry, built to ../ui/index.js (`npm run build:ui` in the app). The dashboard
// imports it and mounts what it exports: pages under /app/<name>/ and panels on
// its own pages.
import { defineMdkApp, MDK_APP_PANEL_SLOT } from '@tetherto/mdk-react-adapter'

import { OverviewPage, SummaryHomePanel } from './pages/overview-page'
import './styles.css'

export default defineMdkApp({
  // Must equal `id` in mdk-app.yaml: the dashboard refuses a mismatch.
  id: '__APP_ID__',
  displayName: '__APP_DISPLAY_NAME__',
  routes: [{ path: '', component: OverviewPage }],
  panels: [{ id: 'summary', slot: MDK_APP_PANEL_SLOT.HOME, component: SummaryHomePanel }],
})
