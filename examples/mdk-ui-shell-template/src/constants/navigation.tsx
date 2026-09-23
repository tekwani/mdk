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
 * A bare shell only ships the Home entry. When you add a page, import its devkit
 * icon above the `mdk:nav-icons-end` marker and add a `NAV_ICONS` entry above
 * `mdk:nav-end`. Keep both markers, and keep each entry on a single line, so the
 * file stays parseable line-wise. Anything without a custom icon falls back to
 * the default.
 */
const NAV_ICONS: Record<string, ReactNode> = {
  [ROUTE_PATHS.HOME]: <ExplorerNavIcon />,
  // mdk:nav-end
}

const DEFAULT_NAV_ICON: ReactNode = <ExplorerNavIcon />

export const getNavIcon = (path: string): ReactNode => NAV_ICONS[path] ?? DEFAULT_NAV_ICON
