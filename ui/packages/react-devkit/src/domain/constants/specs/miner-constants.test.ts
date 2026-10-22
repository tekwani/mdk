import { describe, expect, it, vi } from 'vitest'
import {
  DELETE_MINER,
  MINER_ACTIONS,
  MOVE_MINER
} from '../miner-constants'

vi.mock('@primitives/index', () => ({
  COLOR: {
    LIGHT_BLUE: '#0000FF',
    GRASS_GREEN: '#00FF00',
    BRICK_RED: '#FF0000',
    COLD_ORANGE: '#FFA500',
    YELLOW: '#FFFF00',
    AGED_YELLOW: '#CCCC00',
    DARK_GREEN: '#006400',
  },
}))

describe('Miner Constants', () => {
  describe('Actions', () => {
    it('should have the correct set of MINER_ACTIONS', () => {
      expect(MINER_ACTIONS).toContain(MOVE_MINER)
      expect(MINER_ACTIONS).toContain(DELETE_MINER)
      expect(MINER_ACTIONS).toHaveLength(6)
    })
  })
})
