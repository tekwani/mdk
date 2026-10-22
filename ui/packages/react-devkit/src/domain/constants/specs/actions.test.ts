import { describe, expect, it } from 'vitest'
import {
  ACTION_TYPES,
  MINER_ACTIONS
} from '../actions'

describe('actions constants', () => {
  describe('action types', () => {
    it('should have container actions', () => {
      expect(ACTION_TYPES.SWITCH_CONTAINER).toBe('switchContainer')
      expect(ACTION_TYPES.SWITCH_COOLING_SYSTEM).toBe('switchCoolingSystem')
      expect(ACTION_TYPES.RESET_CONTAINER).toBe('resetContainer')
      expect(ACTION_TYPES.EMERGENCY_STOP).toBe('emergencyStop')
    })

    it('should have miner actions', () => {
      expect(ACTION_TYPES.REBOOT).toBe('reboot')
      expect(ACTION_TYPES.SET_POWER_MODE).toBe('setPowerMode')
      expect(ACTION_TYPES.SET_LED).toBe('setLED')
      expect(ACTION_TYPES.SETUP_POOLS).toBe('setupPools')
    })

    it('should have thing actions', () => {
      expect(ACTION_TYPES.REGISTER_THING).toBe('registerThing')
      expect(ACTION_TYPES.UPDATE_THING).toBe('updateThing')
      expect(ACTION_TYPES.FORGET_THINGS).toBe('forgetThings')
    })

    it('should have rack actions', () => {
      expect(ACTION_TYPES.RACK_REBOOT).toBe('rackReboot')
    })

    it('should have camelCase action names', () => {
      Object.values(ACTION_TYPES).forEach((action) => {
        expect(action).toMatch(/^[a-z][a-zA-Z]*$/)
      })
    })
  })
  describe('action groups', () => {
    it('should have miner actions array', () => {
      expect(Array.isArray(MINER_ACTIONS)).toBe(true)
      expect(MINER_ACTIONS).toContain(ACTION_TYPES.REBOOT)
      expect(MINER_ACTIONS).toContain(ACTION_TYPES.SET_POWER_MODE)
      expect(MINER_ACTIONS).toContain(ACTION_TYPES.SET_LED)
      expect(MINER_ACTIONS).toContain(ACTION_TYPES.SETUP_POOLS)
      expect(MINER_ACTIONS).toHaveLength(4)
    })
  })
})
