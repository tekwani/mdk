'use strict'

const http = require('http')
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js')
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js')
const { loadPlugin } = require('./lib/plugin-loader')

const createMcpServer = async (root, port, client, pluginDirs) => {
  if (!root) throw new Error('ERR_INVALID_MCP_ROOT')
  if (!port) throw new Error('ERR_INVALID_MCP_PORT')

  const services = { mdkClient: client }
  const tools = (pluginDirs || []).flatMap((dir) => loadPlugin(dir).tools)

  const httpServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404).end()
      return
    }
    const server = new McpServer({ name: 'mdk-mcp', version: '1.0.0' })
    for (const tool of tools) {
      server.tool(tool.id, tool.description, tool.schema, (args) => tool._handler(args, services))
    }
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res)
    } catch (err) {
      console.error(err)
      if (!res.writableEnded) res.writeHead(500).end()
    }
  })

  await new Promise((resolve) => httpServer.listen(port, '127.0.0.1', resolve))

  const shutdown = async () => {
    await client.close()
    httpServer.close(() => process.exit(0))
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  return httpServer
}

module.exports = {
  createMcpServer
}
