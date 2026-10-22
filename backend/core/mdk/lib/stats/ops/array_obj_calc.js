'use strict'

const lUtils = require('../utils')
const { getOp } = require('./index')

function arrayObjCalc (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: lUtils.createResMap() }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  const arr = lUtils.getVal(entry, op.src)
  arr?.forEach(obj => {
    op.objOps.forEach(keyOp => {
      if (!lUtils.isSafeKey(keyOp.src)) return
      const val = lUtils.getVal(obj, keyOp.src)
      if (!val) return
      if (!cur.res[keyOp.src]) {
        cur.res[keyOp.src] = val
        return
      }

      const calcFn = getOp(keyOp.op)
      const calcRes = calcFn.calc(keyOp, { res: cur.res[keyOp.src] }, obj)
      cur.res[keyOp.src] = calcRes.res
    })
  })

  return cur
}

module.exports = {
  calc: arrayObjCalc
}
