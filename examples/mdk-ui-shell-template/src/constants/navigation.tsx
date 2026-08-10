import type { ReactNode } from 'react'
import {
  ExplorerNavIcon,
  // mdk:nav-icons-end
} from '@tetherto/mdk-react-devkit'

import { ROUTE_PATHS } from './routes'

/**
 * Sidebar nav icon lookup. Built-in paths map to their dedicated icons;
 * user-added routes fall back to a generic explorer icon.
 *
 * A bare shell only ships the Home entry. When you run `mdk-ui add page <Name>`
 * for a managed page (Dashboard, Alerts, …), the tooling inserts the matching
 * devkit icon import (above the `mdk:nav-icons-end` marker) and a `NAV_ICONS`
 * entry (above `mdk:nav-end`). Keep both markers, and keep each managed entry on
 * a single line, so the tooling can match and patch them. Add your own
 * hand-written entries here too — anything without a custom icon falls back to
 * the default.
 */
const NAV_ICONS: Record<string, ReactNode> = {
  [ROUTE_PATHS.HOME]: <ExplorerNavIcon />,
  // mdk:nav-end
}

const DEFAULT_NAV_ICON: ReactNode = <ExplorerNavIcon />

export const getNavIcon = (path: string): ReactNode => NAV_ICONS[path] ?? DEFAULT_NAV_ICON
