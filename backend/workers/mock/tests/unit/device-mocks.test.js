'use strict'

const test = require('brittle')
const BaseMock = require('../../base.mock')
const ContainerMock = require('../../container.mock')
const PowerMeterMock = require('../../powermeter.mock')
const SensorMock = require('../../sensor.mock')
const MinerpoolMock = require('../../minerpool.mock')
const ModbusTransport = require('../../transports/modbus.transport')
const HttpTransport = require('../../transports/http.transport')

test('ContainerMock - is a BaseMock with no additional behavior of its own', (t) => {
  const mock = new ContainerMock({ type: 'antspace' })
  t.ok(mock instanceof BaseMock)
  t.exception(() => mock.createTransport(), /ERR_ABSTRACT/, 'still requires a transport override')
  t.pass()
})

test('PowerMeterMock - defaults to port 5020', (t) => {
  const mock = new PowerMeterMock()
  t.is(mock.ctx.port, 5020)
  t.pass()
})

test('PowerMeterMock - createTransport wires a ModbusTransport bound to the loaded bind()', (t) => {
  const mock = new PowerMeterMock({ type: 'abb' })
  const bindFn = () => {}
  mock._loaded = { bind: bindFn }
  const transport = mock.createTransport()
  t.ok(transport instanceof ModbusTransport)
  t.is(transport.handlers.bind, bindFn)
  t.pass()
})

test('SensorMock - is a PowerMeterMock (inherits Modbus transport wiring and port)', (t) => {
  const mock = new SensorMock()
  t.ok(mock instanceof PowerMeterMock)
  t.is(mock.ctx.port, 5020, 'inherits the default port')
  t.pass()
})

test('MinerpoolMock - routes() throws ERR_ABSTRACT when not overridden', (t) => {
  const mock = new MinerpoolMock()
  t.exception(() => mock.routes(), /ERR_ABSTRACT/)
  t.pass()
})

test('MinerpoolMock - auth() defaults to null', (t) => {
  const mock = new MinerpoolMock()
  t.is(mock.auth(), null)
  t.pass()
})

test('MinerpoolMock - createTransport wires an HttpTransport with routes/auth/onClose', (t) => {
  const routesFn = () => {}
  class TestPoolMock extends MinerpoolMock {
    routes () { return routesFn }
  }
  const mock = new TestPoolMock()
  mock._stateCleanup = () => 'cleaned'
  const transport = mock.createTransport()
  t.ok(transport instanceof HttpTransport)
  t.is(transport.handlers.routes, routesFn)
  t.is(transport.handlers.auth, null)
  t.is(transport.handlers.onClose(), 'cleaned')
  t.pass()
})
