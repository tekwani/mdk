'use strict'

/**
 * The per-plugin context, required by gateway plugin files as
 * `require('@tetherto/mdk-gateway/plugin')` and resolving to that plugin's
 * frozen context: config, logger and onReady — clients are plugin-owned [per the full surface](./workers/lib/plugin-gateway.js).
 *
 * Inside a plugin the request never reaches [`./workers/lib/plugin-loader.js`](./workers/lib/plugin-loader.js),
 * the module context an app runtime loads each plugin through, intercepts it and hands
 * back the context the plugin was registered with.
 * This file exists to make the specifier resolvable and to fail with a pointer
 * at the plugin loader when a plugin module is required outside a runtime — a
 * test requiring a controller directly, say — instead of leaving the plugin
 * with `undefined` where its context should be.
 */
throw new Error('ERR_NO_PLUGIN_CONTEXT: @tetherto/mdk-gateway/plugin is only available inside a gateway plugin; load the plugin through an app runtime (createAppRuntime) or loadPlugin(dir, context) from @tetherto/mdk-gateway/workers/lib/plugin-loader')
