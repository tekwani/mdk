'use strict'

const { RPC_TIMEOUT } = require('./constants')

const getRpcTimeout = (conf) => {
  return conf.rpcTimeout || RPC_TIMEOUT
}

module.exports = {
  getRpcTimeout
}
