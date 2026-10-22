/* oxlint-disable typescript/ban-ts-comment */
import { UNITS } from '@primitives'
import { describe, expect, it } from 'vitest'
import type { Device } from '../../types/device'
import {
  appendContainerToTag,
  appendIdToTag,
  appendIdToTags,
  formatPowerConsumption,
  getDeviceData,
  getHashrateString,
  getHashrateUnit,
  getMinerName,
  getMinerShortCode,
  getOnOffText,
  getPowerModeColor,
  isAntminer,
  isAvalon,
  isContainer,
  isMiner,
  isMinerOffline,
  isWhatsminer,
  PowerModeColors,
  removeContainerPrefix,
} from '../device-utils'

describe('device utils', () => {
  describe('formatHashRate', () => {
    it('should calculate properly', () => {
      expect(getHashrateUnit(0)).toEqual({ unit: 'MH/s', value: 0, realValue: 0 })
      expect(getHashrateUnit(0, 2, null, true)).toEqual({ unit: '', value: null, realValue: 0 })

      expect(getHashrateUnit(1)).toEqual({ unit: 'MH/s', value: 1, realValue: 1 })
      expect(getHashrateUnit(10)).toEqual({ unit: 'MH/s', value: 10, realValue: 10 })
      expect(getHashrateUnit(100)).toEqual({ unit: 'MH/s', value: 100, realValue: 100 })

      expect(getHashrateUnit(1.5789)).toEqual({ unit: 'MH/s', value: 1.58, realValue: 1.5789 })
      expect(getHashrateUnit(10.54987)).toEqual({ unit: 'MH/s', value: 10.55, realValue: 10.54987 })
      expect(getHashrateUnit(100.458798794)).toEqual({
        unit: 'MH/s',
        value: 100.46,
        realValue: 100.458798794,
      })

      expect(getHashrateUnit(1_000)).toEqual({ unit: 'GH/s', value: 1, realValue: 1_000 })
      expect(getHashrateUnit(10_000)).toEqual({ unit: 'GH/s', value: 10, realValue: 10_000 })
      expect(getHashrateUnit(100_000)).toEqual({ unit: 'GH/s', value: 100, realValue: 100_000 })

      expect(getHashrateUnit(1_000.98977)).toEqual({
        unit: 'GH/s',
        value: 1,
        realValue: 1_000.98977,
      })
      expect(getHashrateUnit(10_000.44477)).toEqual({
        unit: 'GH/s',
        value: 10,
        realValue: 10_000.44477,
      })
      expect(getHashrateUnit(15_427.44477)).toEqual({
        unit: 'GH/s',
        value: 15.43,
        realValue: 15_427.44477,
      })
      expect(getHashrateUnit(137_557.199887)).toEqual({
        unit: 'GH/s',
        value: 137.56,
        realValue: 137_557.199887,
      })

      expect(getHashrateUnit(1_000_000)).toEqual({ unit: 'TH/s', value: 1, realValue: 1_000_000 })
      expect(getHashrateUnit(10_000_000)).toEqual({
        unit: 'TH/s',
        value: 10,
        realValue: 10_000_000,
      })
      expect(getHashrateUnit(100_000_000)).toEqual({
        unit: 'TH/s',
        value: 100,
        realValue: 100_000_000,
      })

      expect(getHashrateUnit(1_557_000)).toEqual({
        unit: 'TH/s',
        value: 1.56,
        realValue: 1_557_000,
      })
      expect(getHashrateUnit(10_981_000)).toEqual({
        unit: 'TH/s',
        value: 10.98,
        realValue: 10_981_000,
      })
      expect(getHashrateUnit(100_144_000)).toEqual({
        unit: 'TH/s',
        value: 100.14,
        realValue: 100_144_000,
      })

      expect(getHashrateUnit(1_000_000_000)).toEqual({
        unit: 'PH/s',
        value: 1,
        realValue: 1_000_000_000,
      })
      expect(getHashrateUnit(10_000_000_000)).toEqual({
        unit: 'PH/s',
        value: 10,
        realValue: 10_000_000_000,
      })
      expect(getHashrateUnit(100_000_000_000)).toEqual({
        unit: 'PH/s',
        value: 100,
        realValue: 100_000_000_000,
      })

      expect(getHashrateUnit(1_669_474_000)).toEqual({
        unit: 'PH/s',
        value: 1.67,
        realValue: 1_669_474_000,
      })
      expect(getHashrateUnit(11_656_000_000)).toEqual({
        unit: 'PH/s',
        value: 11.66,
        realValue: 11_656_000_000,
      })
      expect(getHashrateUnit(995_427_000_000)).toEqual({
        unit: 'PH/s',
        value: 995.43,
        realValue: 995_427_000_000,
      })

      expect(getHashrateUnit(1_669_474_000_000)).toEqual({
        unit: 'EH/s',
        value: 1.67,
        realValue: 1_669_474_000_000,
      })
      expect(getHashrateUnit(11_656_000_000_000)).toEqual({
        unit: 'EH/s',
        value: 11.66,
        realValue: 11_656_000_000_000,
      })
      expect(getHashrateUnit(995_427_000_000_000)).toEqual({
        unit: 'EH/s',
        value: 995.43,
        realValue: 995_427_000_000_000,
      })
    })
  })

  describe('formatPowerConsumption', () => {
    describe('auto-selection behavior (default, no forceUnit)', () => {
      it('should return watts for values less than 1000', () => {
        expect(formatPowerConsumption(0)).toEqual({
          value: 0,
          unit: UNITS.POWER_W,
          realValue: 0,
        })
        expect(formatPowerConsumption(100)).toEqual({
          value: 100,
          unit: UNITS.POWER_W,
          realValue: 100,
        })
        expect(formatPowerConsumption(999)).toEqual({
          value: 999,
          unit: UNITS.POWER_W,
          realValue: 999,
        })
      })

      it('should return kW for values between 1000 and 999999', () => {
        expect(formatPowerConsumption(1000)).toEqual({
          value: 1,
          unit: UNITS.POWER_KW,
          realValue: 1000,
        })
        expect(formatPowerConsumption(5000)).toEqual({
          value: 5,
          unit: UNITS.POWER_KW,
          realValue: 5000,
        })
        expect(formatPowerConsumption(999999)).toEqual({
          value: 999.999,
          unit: UNITS.POWER_KW,
          realValue: 999999,
        })
      })

      it('should return MW for values >= 1000000', () => {
        expect(formatPowerConsumption(1000000)).toEqual({
          value: 1,
          unit: UNITS.ENERGY_MW,
          realValue: 1000000,
        })
        expect(formatPowerConsumption(5000000)).toEqual({
          value: 5,
          unit: UNITS.ENERGY_MW,
          realValue: 5000000,
        })
        expect(formatPowerConsumption(15000000)).toEqual({
          value: 15,
          unit: UNITS.ENERGY_MW,
          realValue: 15000000,
        })
      })

      it('should handle negative values correctly', () => {
        expect(formatPowerConsumption(-100)).toEqual({
          value: -100,
          unit: UNITS.POWER_W,
          realValue: -100,
        })
        expect(formatPowerConsumption(-5000)).toEqual({
          value: -5,
          unit: UNITS.POWER_KW,
          realValue: -5000,
        })
        expect(formatPowerConsumption(-2000000)).toEqual({
          value: -2,
          unit: UNITS.ENERGY_MW,
          realValue: -2000000,
        })
      })
    })

    describe('forced unit conversion', () => {
      it('should force MW conversion regardless of value', () => {
        expect(formatPowerConsumption(100, UNITS.ENERGY_MW)).toEqual({
          value: 0.0001,
          unit: UNITS.ENERGY_MW,
          realValue: 100,
        })
        expect(formatPowerConsumption(5000, UNITS.ENERGY_MW)).toEqual({
          value: 0.005,
          unit: UNITS.ENERGY_MW,
          realValue: 5000,
        })
        expect(formatPowerConsumption(2000000, UNITS.ENERGY_MW)).toEqual({
          value: 2,
          unit: UNITS.ENERGY_MW,
          realValue: 2000000,
        })
      })

      it('should force kW conversion regardless of value', () => {
        expect(formatPowerConsumption(100, UNITS.POWER_KW)).toEqual({
          value: 0.1,
          unit: UNITS.POWER_KW,
          realValue: 100,
        })
        expect(formatPowerConsumption(5000, UNITS.POWER_KW)).toEqual({
          value: 5,
          unit: UNITS.POWER_KW,
          realValue: 5000,
        })
        expect(formatPowerConsumption(2000000, UNITS.POWER_KW)).toEqual({
          value: 2000,
          unit: UNITS.POWER_KW,
          realValue: 2000000,
        })
      })

      it('should force W conversion regardless of value', () => {
        expect(formatPowerConsumption(100, UNITS.POWER_W)).toEqual({
          value: 100,
          unit: UNITS.POWER_W,
          realValue: 100,
        })
        expect(formatPowerConsumption(5000, UNITS.POWER_W)).toEqual({
          value: 5000,
          unit: UNITS.POWER_W,
          realValue: 5000,
        })
        expect(formatPowerConsumption(2000000, UNITS.POWER_W)).toEqual({
          value: 2000000,
          unit: UNITS.POWER_W,
          realValue: 2000000,
        })
      })
    })

    describe('edge cases', () => {
      it('should handle non-finite values', () => {
        // @ts-ignore
        expect(formatPowerConsumption(null)).toEqual({
          value: null,
          unit: '',
          realValue: null,
        })
        // @ts-ignore
        expect(formatPowerConsumption(undefined)).toEqual({
          value: null,
          unit: '',
          realValue: undefined,
        })
        expect(formatPowerConsumption(Number.NaN)).toEqual({
          value: null,
          unit: '',
          realValue: Number.NaN,
        })
        expect(formatPowerConsumption(Infinity)).toEqual({
          value: null,
          unit: '',
          realValue: Infinity,
        })
        expect(formatPowerConsumption(-Infinity)).toEqual({
          value: null,
          unit: '',
          realValue: -Infinity,
        })
      })

      it('should handle boundary values', () => {
        expect(formatPowerConsumption(999)).toEqual({
          value: 999,
          unit: UNITS.POWER_W,
          realValue: 999,
        })
        expect(formatPowerConsumption(1000)).toEqual({
          value: 1,
          unit: UNITS.POWER_KW,
          realValue: 1000,
        })
        expect(formatPowerConsumption(999999)).toEqual({
          value: 999.999,
          unit: UNITS.POWER_KW,
          realValue: 999999,
        })
        expect(formatPowerConsumption(1000000)).toEqual({
          value: 1,
          unit: UNITS.ENERGY_MW,
          realValue: 1000000,
        })
      })

      it('should preserve realValue when forcing unit', () => {
        const result = formatPowerConsumption(5000, UNITS.ENERGY_MW)
        expect(result.realValue).toBe(5000)
        expect(result.value).toBe(0.005)
        expect(result.unit).toBe(UNITS.ENERGY_MW)
      })
    })
  })

  describe('isMinerOffline', () => {
    it('should detect status properly', () => {
      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {
                status: 'offline',
              },
              config: {
                key1: 'val1',
              },
            },
          },
        }),
      ).toBe(true)

      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {
                status: 'other',
              },
              config: {
                key1: 'val1',
              },
            },
          },
        }),
      ).toBe(false)
    })

    it('should detect status properly when no config', () => {
      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {
                status: 'offline',
              },
              config: {},
            },
          },
        }),
      ).toBe(true)

      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {
                status: 'offline',
              },
            },
          },
        }),
      ).toBe(true)
    })

    it('should detect status when no stats', () => {
      expect(
        isMinerOffline({
          last: {
            snap: {
              config: {
                key1: 'val1',
              },
            },
          },
        }),
      ).toBe(false)

      expect(
        isMinerOffline({
          last: {
            snap: {
              stats: {},
              config: {
                key1: 'val1',
              },
            },
          },
        }),
      ).toBe(false)
    })

    it('should detect status when no stats and no config', () => {
      expect(
        isMinerOffline({
          last: {
            snap: {},
          },
        }),
      ).toBe(true)
    })
  })

  describe('getHashrateString', () => {
    it('should return formatted hashrate', () => {
      const cases: Record<number, string> = {
        1e6: '1 TH/s',
        6e6: '6 TH/s',
        6e5: '600 GH/s',
        6e2: '600 MH/s',
        6e1: '60 MH/s',
        6.6e1: '66 MH/s',
      }
      for (const testCase in cases) {
        if (!Object.hasOwn(cases, testCase)) continue

        const expected = cases[testCase]
        expect(getHashrateString(Number.parseInt(testCase))).toBe(expected)
      }
    })

    it('should treat 0 as no data', () => {
      expect(getHashrateString(0, true)).toBe('-')
    })

    it('should treat 0 as data', () => {
      expect(getHashrateString(0)).toBe('0 MH/s')
    })
  })

  describe('getOnOffText', () => {
    it('should return correct text', () => {
      expect(getOnOffText(true)).toBe('On')
      expect(getOnOffText(false)).toBe('Off')
      expect(getOnOffText(null)).toBe('-')
      expect(getOnOffText(null, 'x')).toBe('x')
    })
  })
  describe('power mode', () => {
    it('should have power mode colors', () => {
      expect(PowerModeColors.sleep).toBeDefined()
      expect(PowerModeColors.low).toBeDefined()
      expect(PowerModeColors.normal).toBeDefined()
      expect(PowerModeColors.high).toBeDefined()
    })

    it('should get power mode color', () => {
      expect(getPowerModeColor('sleep')).toBeDefined()
      expect(getPowerModeColor('high')).toBeDefined()
    })
  })

  describe('miner name', () => {
    it('should get miner name from type', () => {
      const name = getMinerName('miner-am-s19')
      expect(name).toBeTruthy()
      expect(typeof name).toBe('string')
    })
  })

  describe('isMinerOffline advanced cases', () => {
    it('should detect offline by status', () => {
      const device = {
        last: {
          snap: {
            stats: { status: 'offline' },
            config: { mode: 'normal' },
          },
        },
      }
      expect(isMinerOffline(device)).toBe(true)
    })

    it('should detect offline by empty stats and config', () => {
      const device = {
        last: {
          snap: {
            stats: {},
            config: {},
          },
        },
      }
      expect(isMinerOffline(device)).toBe(true)
    })

    it('should not be offline with stats and config present', () => {
      const device = {
        last: {
          snap: {
            stats: { status: 'mining', power: 100 },
            config: { mode: 'normal' },
          },
        },
      }
      expect(isMinerOffline(device)).toBe(false)
    })

    describe('removeContainerPrefix', () => {
      it('should remove container prefix', () => {
        expect(removeContainerPrefix('container-test')).toEqual('test')
      })
    })
  })

  describe('getDeviceData', () => {
    describe('missing last data', () => {
      it('should return device with empty snap when last is missing', () => {
        const device: Device = {
          id: 'device-1',
          type: 'container',
          tags: ['tag1'],
        }

        const [error, data] = getDeviceData(device)

        expect(error).toBeUndefined()
        expect(data).toBeDefined()
        expect(data?.snap).toEqual({ stats: {}, config: {} })
        expect(data?.err).toBe('Last Device info not found')
        expect(data?.id).toBe('device-1')
      })
    })

    describe('valid device data', () => {
      it('should return device data with snap when last exists', () => {
        const device: Device = {
          id: 'device-1',
          type: 'container',
          tags: ['tag1'],
          last: {
            snap: {
              stats: { temperature: 25 },
              config: { mode: 'auto' },
            },
            alerts: [],
          },
        } as unknown as Device

        const [error, data] = getDeviceData(device)

        expect(error).toBeUndefined()
        expect(data).toBeDefined()
      })

      it('should return error when last contains error', () => {
        const device: Device = {
          id: 'device-1',
          type: 'container',
          last: {
            err: 'Connection timeout',
            snap: {
              stats: {},
              config: {},
            },
          },
        } as unknown as Device

        const [error, data] = getDeviceData(device)

        expect(error).toBe('Connection timeout')
        expect(data).toBeDefined()
        expect(data?.err).toBe('Connection timeout')
      })

      it('should use default snap when snap is null', () => {
        const device: Device = {
          id: 'device-1',
          last: {
            snap: null,
          },
        } as unknown as Device

        const [error, data] = getDeviceData(device)

        expect(error).toBeUndefined()
        expect(data?.snap).toEqual({ stats: {}, config: {} })
      })

      it('should preserve the device fields it carries', () => {
        const device: Device = {
          id: 'device-1',
          type: 'container',
          tags: ['tag1', 'tag2'],
          info: { location: 'datacenter-1' },
          address: '192.168.1.1',
          last: {
            snap: {
              stats: { power: 100 },
              config: {},
            },
            alerts: [{ type: 'warning' }],
          },
        } as unknown as Device

        const [error, data] = getDeviceData(device)

        expect(error).toBeUndefined()
        expect(data?.id).toBe('device-1')
        expect(data?.type).toBe('container')
        expect(data?.tags).toEqual(['tag1', 'tag2'])
        expect(data?.info).toEqual({ location: 'datacenter-1' })
        expect(data?.address).toBe('192.168.1.1')
        expect(data?.alerts).toEqual([{ type: 'warning' }])
      })
    })
  })
  describe('appendContainerToTag', () => {
    it('should append container to tag', () => {
      const tag = 'tag1'
      const result = appendContainerToTag(tag)

      expect(result).toBe('container-tag1')
    })
  })
  describe('isMiner', () => {
    it('returns true for miner type', () => {
      expect(isMiner('miner-s19')).toBe(true)
    })

    it('returns false for non-miner type', () => {
      expect(isMiner('container-s19')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isMiner(undefined)).toBe(false)
    })

    it('is case sensitive (does not match uppercase)', () => {
      expect(isMiner('MINER-s19')).toBe(false)
    })
  })

  describe('isContainer', () => {
    it('returns true for container type', () => {
      expect(isContainer('container-s19')).toBe(true)
    })

    it('returns false for non-container type', () => {
      expect(isContainer('miner-s19')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isContainer(undefined)).toBe(false)
    })

    it('is case sensitive (does not match uppercase)', () => {
      expect(isContainer('CONTAINER-s19')).toBe(false)
    })
  })
  describe('appendIdToTag', () => {
    it('prepends "id-" to a device id', () => {
      expect(appendIdToTag('abc123')).toBe('id-abc123')
    })

    it('handles numeric string ids', () => {
      expect(appendIdToTag('42')).toBe('id-42')
    })

    it('handles ids that already contain dashes', () => {
      expect(appendIdToTag('site-row-rack')).toBe('id-site-row-rack')
    })

    it('handles empty string', () => {
      expect(appendIdToTag('')).toBe('id-')
    })

    it('handles ids with special characters', () => {
      expect(appendIdToTag('device:001')).toBe('id-device:001')
    })
  })

  describe('appendIdToTags', () => {
    it('prepends "id-" to each device id in the list', () => {
      expect(appendIdToTags(['a', 'b', 'c'])).toEqual(['id-a', 'id-b', 'id-c'])
    })

    it('returns empty array for empty input', () => {
      expect(appendIdToTags([])).toEqual([])
    })

    it('handles a single-element list', () => {
      expect(appendIdToTags(['only'])).toEqual(['id-only'])
    })

    it('preserves order of elements', () => {
      const ids = ['z', 'a', 'm']
      expect(appendIdToTags(ids)).toEqual(['id-z', 'id-a', 'id-m'])
    })

    it('does not mutate the input array', () => {
      const ids = ['x', 'y']
      const copy = [...ids]
      appendIdToTags(ids)
      expect(ids).toEqual(copy)
    })

    it('each result is consistent with appendIdToTag applied individually', () => {
      const ids = ['foo', 'bar', 'baz']
      const result = appendIdToTags(ids)
      ids.forEach((id, i) => {
        expect(result[i]).toBe(appendIdToTag(id))
      })
    })
  })
  describe('isAvalon', () => {
    it('returns true for avalon model', () => {
      expect(isAvalon('miner-av')).toBe(true)
      expect(isAvalon('miner-av-something')).toBe(true)
    })
  })
  describe('isWhatsminer', () => {
    it('returns true for whatsminer model', () => {
      expect(isWhatsminer('miner-wm')).toBe(true)
      expect(isWhatsminer('miner-wm-something')).toBe(true)
    })
  })
  describe('isAntminer', () => {
    it('returns true for antiminer model', () => {
      expect(isAntminer('miner-am')).toBe(true)
      expect(isAntminer('miner-am-something')).toBe(true)
    })
  })

  describe('getMinerShortCode', () => {
    it('should return the explicit code if it is provided', () => {
      const result = getMinerShortCode('M123', ['code-ignored'])
      expect(result).toBe('M123')
    })

    it('should extract the code from tags if explicit code is missing', () => {
      const tags = ['site-1', 'code-B45', 'pos-01_02']
      const result = getMinerShortCode(undefined, tags)
      expect(result).toBe('B45')
    })

    it('should ignore tags that end with "undefined"', () => {
      const tags = ['code-undefined', 'code-C78']
      const result = getMinerShortCode(undefined, tags)
      expect(result).toBe('C78')
    })

    it('should return the default value if no code or valid tag is found', () => {
      const tags = ['site-1', 'pos-01_02']
      const result = getMinerShortCode(undefined, tags)
      expect(result).toBe('N/A')
    })

    it('should return a custom default value if provided', () => {
      const result = getMinerShortCode(undefined, [], 'Unknown')
      expect(result).toBe('Unknown')
    })

    it('should handle undefined tags array gracefully', () => {
      const result = getMinerShortCode(undefined, undefined)
      expect(result).toBe('N/A')
    })

    it('should return the first valid code tag found if multiple exist', () => {
      const tags = ['code-FIRST', 'code-SECOND']
      const result = getMinerShortCode(undefined, tags)
      expect(result).toBe('FIRST')
    })
  })
})
