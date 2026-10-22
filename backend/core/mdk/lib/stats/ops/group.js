'use strict'

const lUtils = require('./../utils')

function group (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: lUtils.createResMap() }
  }

  if (!entry) {
    return cur
  }

  if (!op.src) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  if (!op.group) {
    return cur
  }
  const groupName = op.group(entry, ext)

  if (!groupName || !lUtils.isSafeKey(groupName)) {
    return cur
  }

  cur.res[groupName] = lUtils.getVal(entry, op.src)

  return cur
}

module.exports = {
  calc: group
}
