
export const ACTION_TYPES = {
  // Container actions
  SWITCH_CONTAINER: 'switchContainer',
  SWITCH_COOLING_SYSTEM: 'switchCoolingSystem',
  SET_TANK_ENABLED: 'setTankEnabled',
  SET_AIR_EXHAUST_ENABLED: 'setAirExhaustEnabled',
  RESET_COOLING_SYSTEM: 'resetCoolingSystem',
  SET_LIQUID_SUPPLY_TEMPERATURE: 'setLiquidSupplyTemperature',
  SET_TEMPERATURE_SETTINGS: 'setTemperatureSettings',
  SET_COOLING_FAN_THRESHOLD: 'setCoolingFanThreshold',
  SWITCH_SOCKET: 'switchSocket',
  RESET_ALARM: 'resetAlarm',
  RESET_CONTAINER: 'resetContainer',
  EMERGENCY_STOP: 'emergencyStop',
  MAINTENANCE: 'maintenance',

  // Miner actions
  REBOOT: 'reboot',
  SET_POWER_MODE: 'setPowerMode',
  SETUP_FREQUENCY_SPEED: 'setUpfreqSpeed',
  SET_LED: 'setLED',
  SETUP_POOLS: 'setupPools',

  // Thing actions
  REGISTER_THING: 'registerThing',
  UPDATE_THING: 'updateThing',
  FORGET_THINGS: 'forgetThings',

  // Rack actions
  RACK_REBOOT: 'rackReboot',

  // Pool Manager
  REGISTER_POOL_CONFIG: 'registerConfig',
  UPDATE_POOL_CONFIG: 'updateConfig',
} as const
export const MINER_ACTIONS = [
  ACTION_TYPES.REBOOT,
  ACTION_TYPES.SET_POWER_MODE,
  ACTION_TYPES.SET_LED,
  ACTION_TYPES.SETUP_POOLS,
] as const
// Type exports
export type ActionTypeKey = keyof typeof ACTION_TYPES
export type ActionTypeValue = (typeof ACTION_TYPES)[ActionTypeKey]
export type MinerActionValue = (typeof MINER_ACTIONS)[number]
