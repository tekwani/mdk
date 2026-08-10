'use strict'

const { cachedRoute } = require('./server/lib/cachedRoute')
const { send200 } = require('./server/lib/send200')

function _extractCacheKeyParts (fields, req) {
  return fields.map(field => {
    const parts = field.split('.')
    return parts.reduce((obj, key) => (obj != null ? obj[key] : undefined), req)
  })
}

function buildFastifyRoutes (plugin, ctx) {
  return plugin.routes.map(route => {
    const fastifyRoute = {
      method: route.method,
      url: route.path
    }

    if (route.schema) {
      fastifyRoute.schema = route.schema
    }

    const cacheFields = route.cache

    fastifyRoute.handler = async (req, rep) => {
      const pluginReq = {
        params: req.params,
        query: req.query,
        body: req.body,
        headers: req.headers,
        _info: req._info || {}
      }

      let result
      if (cacheFields && Array.isArray(cacheFields)) {
        const keyParts = [route.id, ..._extractCacheKeyParts(cacheFields, req)]
        result = await cachedRoute(
          ctx,
          keyParts,
          route.path,
          () => route._handler(pluginReq),
          !!req.query?.overwriteCache
        )
      } else {
        result = await route._handler(pluginReq)
      }

      return send200(rep, result)
    }

    return fastifyRoute
  })
}

module.exports = { buildFastifyRoutes }
