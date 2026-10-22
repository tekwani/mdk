import { describe, expect, it } from 'vitest'
import {
  getContainerName
} from '../container-utils'

const GET_CONTAINER_NAME_TEST_ARGS = {
  bitdeer: { type: 'container-bd-d40-m56', container: 'bitdeer-5a' },
  bitmainImmersion: { type: 'container-as-immersion', container: 'antspace-immersion-2' },
  bitmainHydro: { type: 'container-as-hk3', container: 'bitmain-hydro-1' },
  microBT: { type: 'container-mbt-alpha', container: 'microbt-1' },
}

describe('container utils', () => {
  describe('getContainerName', () => {
    it('should get the proper container name', () => {
      expect(
        getContainerName(
          GET_CONTAINER_NAME_TEST_ARGS.bitdeer.container,
          GET_CONTAINER_NAME_TEST_ARGS.bitdeer.type,
        ),
      ).toBe('Bitdeer 5a M56')

      expect(
        getContainerName(
          GET_CONTAINER_NAME_TEST_ARGS.bitmainImmersion.container,
          GET_CONTAINER_NAME_TEST_ARGS.bitmainImmersion.type,
        ),
      ).toBe('Antspace Immersion 2')

      expect(
        getContainerName(
          GET_CONTAINER_NAME_TEST_ARGS.bitmainHydro.container,
          GET_CONTAINER_NAME_TEST_ARGS.bitmainHydro.type,
        ),
      ).toBe('Bitmain Hydro 1')

      expect(
        getContainerName(
          GET_CONTAINER_NAME_TEST_ARGS.microBT.container,
          GET_CONTAINER_NAME_TEST_ARGS.microBT.type,
        ),
      ).toBe('MicroBT 1 Alpha')
    })
  })
  describe('getContainerName edge cases', () => {
    it('should handle maintenance container', () => {
      expect(getContainerName('maintenance')).toBe('Maintenance')
    })

    it('should handle empty container', () => {
      expect(getContainerName('')).toBe('')
      expect(getContainerName(undefined)).toBe('')
    })

    it('should handle container without type', () => {
      expect(getContainerName('bitdeer-1')).toBe('Bitdeer 1')
      expect(getContainerName('microbt-1')).toBe('Microbt 1')
    })

    it('should handle MicroBT Beta', () => {
      expect(getContainerName('microbt-1', 'container-mbt-beta')).toBe('MicroBT 1 Beta')
    })

    it('should handle MicroBT without matching type', () => {
      expect(getContainerName('microbt-1', 'container-mbt-unknown')).toBe('MicroBT 1')
    })

    it('should handle generic three-part names', () => {
      expect(getContainerName('some-test-1')).toBe('Some Test 1')
    })

    it('should handle two-part names when three-part pattern does not match', () => {
      expect(getContainerName('M221-1')).toBe('M221 1')
    })

    it('should handle Bitdeer with type variations', () => {
      expect(getContainerName('bitdeer-1a', 'container-bd-d40-m30')).toContain('Bitdeer')
      expect(getContainerName('bitdeer-1a', 'container-bd-d40-m30')).toContain('M30')
      expect(getContainerName('bitdeer-2b', 'container-bd-d40-s19xp')).toContain('S19XP')
    })

    it('should handle MicroBT Alpha with full type', () => {
      const result = getContainerName('microbt-2', 'container-mbt-alpha')
      expect(result).toContain('MicroBT')
      expect(result).toContain('2')
      expect(result).toContain('Alpha')
    })

    it('should handle case sensitivity in container detection', () => {
      expect(getContainerName('BITDEER-1')).toContain('Bitdeer')
      expect(getContainerName('MICROBT-1')).toContain('Microbt')
    })

    it('should return empty string for null-ish values', () => {
      expect(getContainerName(null as any)).toBe('')
      expect(getContainerName('' as any)).toBe('')
    })
  })
})
