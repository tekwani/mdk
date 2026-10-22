'use strict'

const test = require('brittle')
const { assertSafeQuery, assertSafeProjection } = require('../../lib/modules/action-manager/query-guard')

test('query-guard - plain comparison and logical operators pass', (t) => {
  assertSafeQuery({ $and: [{ id: { $in: [1, 2] } }, { 'targets.w': { $exists: true } }], status: { $ne: 'x' } })
  assertSafeQuery(undefined)
  assertSafeProjection({ id: 1, action: true })
  t.pass()
})

test('query-guard - $regex, $where and $expr are refused', (t) => {
  t.exception(() => assertSafeQuery({ voter: { $regex: '^(a+)+$' } }), /operator \$regex is not allowed/)
  t.exception(() => assertSafeQuery({ $where: 'sleep(1000)' }), /\$where/)
  t.exception(() => assertSafeQuery({ $or: [{ $expr: { $eq: [1, 1] } }] }), /\$expr/)
  t.exception(() => assertSafeQuery([]), /ERR_QUERY_INVALID/)
})

test('query-guard - nesting and projection limits', (t) => {
  let deep = { a: 1 }
  for (let i = 0; i < 20; i++) deep = { $and: [deep] }
  t.exception(() => assertSafeQuery(deep), /nesting/)
  t.exception(() => assertSafeProjection({ calls: { $slice: 1 } }), /projection value/)
  t.exception(() => assertSafeProjection({ $meta: 1 }), /projection operator/)
})
