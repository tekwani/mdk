/*
 * Kept free of imports, and published on its own subpath
 * (`@tetherto/mdk-ui-foundation/app-shared-modules`), so a build config running
 * in plain Node — a shell's or an app's vite.config — can read the list without
 * loading the rest of the package.
 */

/**
 * Bare module specifiers a shell provides to the app UIs it loads.
 *
 * An app's UI is built separately from the shell, but it must render with the
 * shell's own React, router, query client and MDK packages: a second React
 * breaks hooks, and a second adapter cannot see the shell's `MdkProvider`. So an
 * app build leaves exactly these imports unresolved (`external`), and the shell
 * maps each one, through an import map, to the instance it already runs.
 *
 * An app importing anything else must bundle it. Adding a specifier here is a
 * contract change: every shell has to provide it.
 *
 * @category apps
 */
export const MDK_APP_SHARED_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-router',
  '@tanstack/react-query',
  '@tetherto/mdk-ui-foundation',
  '@tetherto/mdk-react-adapter',
  '@tetherto/mdk-react-devkit',
] as const

/**
 * One of {@link MDK_APP_SHARED_MODULES}.
 *
 * @category apps
 */
export type MdkAppSharedModule = (typeof MDK_APP_SHARED_MODULES)[number]
