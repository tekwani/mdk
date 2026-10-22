'use strict'

// The loader lives in @tetherto/mdk-app-runtime, which loads and runs app
// handlers; the Gateway only reads route tables with it. This path stays as a
// re-export for existing callers.
module.exports = require('@tetherto/mdk-app-runtime/lib/plugin-loader')
