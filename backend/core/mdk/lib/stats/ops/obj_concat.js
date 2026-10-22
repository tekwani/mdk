'use strict'

const lUtils = require('../utils')

function objConcat (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: lUtils.createResMap() }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  const val = lUtils.getVal(entry, op.src)
  for (const keys in val) {
    if (!lUtils.isSafeKey(keys)) continue
    if (!cur.res[keys]) {
      cur.res[keys] = val[keys]
    } else {
      cur.res[keys] += val[keys]
    }
  }

  return cur
}

module.exports = {
  calc: objConcat
}
