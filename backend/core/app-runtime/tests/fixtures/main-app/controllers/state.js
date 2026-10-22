'use strict'

const state = require('../lib/state')

module.exports = async function () {
  return state.started
}
