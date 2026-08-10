'use strict'

const { generateMockBlocks, generateMockWorkers, generateMockTransactions } = require('./utils')

module.exports = function (CTX) {
  const workersState = generateMockWorkers('test', CTX && CTX.workerCount)
  const workerNames = Object.keys(workersState.workers)
  // Aggregate hashrate from the actual generated workers so `hashrate.workers`
  // and the pool totals agree with each other (and scale with the real fleet
  // size when CTX.workerCount is threaded in from the site's --miners flag).
  const totalHashrate = workerNames.reduce((sum, name) => sum + workersState.workers[name][0].hashrate_60s, 0)

  const state = {
    blocks: generateMockBlocks(10),
    workers: workersState,
    transactions: generateMockTransactions('test', Date.now() - 7 * 24 * 60 * 60 * 1000, Date.now()),
    hashrate: {
      hashrate_1m: totalHashrate,
      hashrate_5m: totalHashrate,
      hashrate_30m: totalHashrate,
      hashrate_1h: totalHashrate,
      hashrate_1d: totalHashrate,
      workers: workerNames.length
    }
  }

  const initialState = JSON.parse(JSON.stringify(state))

  function cleanup () {
    Object.assign(state, initialState)
    return state
  }

  return { state, cleanup }
}
