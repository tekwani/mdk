'use strict'

const path = require('path')

function _validateManifest (manifest, pluginDir) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: must be a JSON object`)
  }

  for (const field of ['name', 'version']) {
    if (typeof manifest[field] !== 'string' || !manifest[field]) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: missing required field "${field}"`)
    }
  }

  if (!Array.isArray(manifest.tools) || manifest.tools.length === 0) {
    throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: "tools" must be a non-empty array`)
  }

  const seenIds = new Set()

  for (const tool of manifest.tools) {
    if (typeof tool.id !== 'string' || !tool.id) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: tool missing required field "id"`)
    }

    if (typeof tool.handler !== 'string' || !tool.handler) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: tool "${tool.id}" missing required field "handler"`)
    }

    if (typeof tool.description !== 'string' || !tool.description) {
      throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: tool "${tool.id}" missing required field "description"`)
    }

    if (seenIds.has(tool.id)) {
      throw new Error(`ERR_PLUGIN_TOOL_DUPLICATE_ID: ${pluginDir}: duplicate tool id "${tool.id}"`)
    }
    seenIds.add(tool.id)
  }
}

function loadPlugin (pluginDir) {
  const manifestPath = path.join(pluginDir, 'mcp-plugin.json')

  let manifest
  try {
    manifest = require(manifestPath)
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error(`ERR_PLUGIN_MANIFEST_MISSING: ${pluginDir}`)
    }
    throw new Error(`ERR_PLUGIN_MANIFEST_INVALID: ${pluginDir}: ${err.message}`)
  }

  _validateManifest(manifest, pluginDir)

  const tools = manifest.tools.map(tool => {
    const [handlerFile, namedExport] = tool.handler.split('#')
    const handlerPath = path.resolve(pluginDir, handlerFile)

    let mod
    try {
      mod = require(handlerPath)
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new Error(`ERR_PLUGIN_HANDLER_NOT_FOUND: ${pluginDir}: tool "${tool.id}" handler "${tool.handler}"`)
      }
      throw new Error(`ERR_PLUGIN_HANDLER_NOT_FOUND: ${pluginDir}: tool "${tool.id}": ${err.message}`)
    }

    const resolved = namedExport ? mod[namedExport] : mod
    const handler = resolved && resolved.handler

    if (typeof handler !== 'function') {
      throw new Error(`ERR_PLUGIN_HANDLER_NOT_FUNCTION: ${pluginDir}: tool "${tool.id}" must export a "handler" function`)
    }

    return {
      id: tool.id,
      description: tool.description,
      schema: resolved.schema || {},
      _handler: handler
    }
  })

  return { manifest, tools }
}

module.exports = { loadPlugin }
