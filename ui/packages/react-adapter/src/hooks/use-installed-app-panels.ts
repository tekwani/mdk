import type { InstalledApp } from '@tetherto/mdk-ui-foundation'
import { useMemo } from 'react'

import type { AppUiLoadFailure, MdkAppPanel, MdkAppPanelSlot } from '../apps/types'
import { MDK_APP_PANEL_SLOT } from '../apps/types'
import { useInstalledAppUis, type UseInstalledAppUisOptions } from './use-installed-app-uis'

/**
 * One panel an installed app contributes to a slot, with the app it belongs to.
 *
 * @category apps
 */
export type InstalledAppPanel = {
  app: InstalledApp
  panel: MdkAppPanel
}

export type UseInstalledAppPanelsResult = {
  /** The panels for the slot, in the dashboard's app order, then each app's order. */
  panels: InstalledAppPanel[]
  /**
   * Apps whose UI did not load. Reported on {@link MDK_APP_PANEL_SLOT}.HOME
   * only, where an operator looks first; empty for every other slot.
   */
  failures: AppUiLoadFailure[]
}

/**
 * The installed apps' panels for one shell slot, ready to render: the shell
 * wraps each in the app's `MdkAppProvider` and an error boundary.
 *
 * @example
 * ```tsx
 * const { panels, failures } = useInstalledAppPanels(MDK_APP_PANEL_SLOT.HOME)
 * ```
 * @category apps
 */
export const useInstalledAppPanels = (
  slot: MdkAppPanelSlot,
  options?: UseInstalledAppUisOptions,
): UseInstalledAppPanelsResult => {
  const { apps, failures } = useInstalledAppUis(options)

  return useMemo(
    () => ({
      panels: apps.flatMap(({ app, ui }) =>
        ui.panels.filter((panel) => panel.slot === slot).map((panel) => ({ app, panel })),
      ),
      failures: slot === MDK_APP_PANEL_SLOT.HOME ? failures : [],
    }),
    [apps, failures, slot],
  )
}
