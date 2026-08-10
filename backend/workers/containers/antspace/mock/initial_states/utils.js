'use strict'

const crypto = require('crypto')

const randomFloat = () => {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

const randomNumber = (min = 0, max = 1) => {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

const getRandomPower = () => {
  return randomNumber(2000, 3000)
}

const getRandomIP = () => [...crypto.randomBytes(4)].join('.')

// Helper function to create fault fields
const createFaultFields = (faultNames, errorValue) => {
  const faults = {}
  for (const name of faultNames) {
    faults[name] = errorValue
  }
  return faults
}

// Helper function to create miner info entries
const createMinerInfoEntries = () => {
  const minerEntries = [
    {
      miner_type: 'S17 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 2565,
      GHS_5s: 87.83214750771423,
      GHS_avg: 124.3864406464078,
      pcb_max_temp: 19,
      chip_max_temp: 46
    },
    {
      miner_type: 'S19 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 3986,
      GHS_5s: 141.96580437744242,
      GHS_avg: 128.08028841162994,
      pcb_max_temp: 32,
      chip_max_temp: 62
    },
    {
      miner_type: 'S19 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 686,
      GHS_5s: 74.66696038808021,
      GHS_avg: 9.137263799960047,
      pcb_max_temp: 39,
      chip_max_temp: 10
    },
    {
      miner_type: 'S19 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 7576,
      GHS_5s: 154.767296148344,
      GHS_avg: 165.14126176502378,
      pcb_max_temp: 32,
      chip_max_temp: 81
    },
    {
      miner_type: 'S20 Hydro',
      miner_version: '2021-08-10 16:54:03',
      elapsed: 1539,
      GHS_5s: 107.96540202661427,
      GHS_avg: 98.47839348764413,
      pcb_max_temp: 48,
      chip_max_temp: 33
    }
  ]

  const minerInfo = {}
  for (const entry of minerEntries) {
    minerInfo[getRandomIP()] = entry
  }
  return minerInfo
}

// Baseline rack: 120 miners, ~105.5 GH/s each. Scales to ctx.minerCount (the
// number of things actually seeded into this container) so total_hashrate
// stays consistent with a fleet sized by `--miners N` instead of always
// reporting the same full-rack numbers.
const BASELINE_MINER_NUM = 120
const BASELINE_TOTAL_HASHRATE = 12665.544871159516
const BASELINE_HASHRATE_PER_MINER = BASELINE_TOTAL_HASHRATE / BASELINE_MINER_NUM

const minerInfoTotals = (ctx) => {
  const minerNum = (ctx && ctx.minerCount) || BASELINE_MINER_NUM
  return {
    minerNum,
    totalHashrate: minerNum * BASELINE_HASHRATE_PER_MINER
  }
}

// Average draw of one modern air-cooled ASIC (Antminer S19XP / WhatsMiner
// M56S land in this range). The two distribution boxes split the container's
// total load, scaled to ctx.minerCount so power stays consistent with the
// miners actually seeded instead of a flat placeholder that doesn't track
// `--miners N` (mirrors minerInfoTotals's hashrate scaling above).
const AVG_MINER_POWER_W = 3300

const distributionBoxPowers = (ctx) => {
  const minerNum = (ctx && ctx.minerCount) || BASELINE_MINER_NUM
  const totalPowerW = minerNum * AVG_MINER_POWER_W
  return [randomNumber(-0.02, 0.02), randomNumber(-0.02, 0.02)]
    .map((jitter) => Math.round((totalPowerW / 2) * (1 + jitter) * 100) / 100)
}

module.exports = {
  getRandomPower,
  getRandomIP,
  createFaultFields,
  createMinerInfoEntries,
  minerInfoTotals,
  distributionBoxPowers
}
