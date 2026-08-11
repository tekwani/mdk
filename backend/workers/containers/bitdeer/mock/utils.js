'use strict'

const crypto = require('crypto')

const dateFormat0 = (d) => {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`
}

const randomFloat = () => {
  return crypto.randomBytes(6).readUIntBE(0, 6) / 2 ** 48
}

const randomNumber = (min, max) => {
  const number = randomFloat() * (max - min) + min
  return parseFloat(number.toFixed(2))
}

// kW per phase (lib/bitdeer.js converts PowerData → W by multiplying by
// 1000, matching the real D40's kW-denominated MQTT telemetry).
const getRandomPower = () => {
  return randomNumber(2, 3)
}

// Average draw of one Avalon A1346 (the only family this container racks,
// see seedAvalonMiners) and a full-tank fallback miner count. Scales the
// three reported phases to ctx.minerCount so total power stays consistent
// with the fleet actually seeded instead of a flat placeholder that doesn't
// track `--miners N`.
const AVG_MINER_POWER_KW = 3.1
const BASELINE_MINER_NUM = 90

const phasePowersKw = (ctx) => {
  const minerNum = (ctx && ctx.minerCount) || BASELINE_MINER_NUM
  const totalKw = minerNum * AVG_MINER_POWER_KW
  return [0, 1, 2].map(() => Math.round((totalKw / 3) * (1 + randomNumber(-0.02, 0.02)) * 100) / 100)
}

module.exports = {
  dateFormat0,
  getRandomPower,
  phasePowersKw
}
