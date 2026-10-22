import { describe, expect, it, vi } from 'vitest'

import { TYPE_FILTER_MAP } from '../type-filter-map'

vi.mock('@domain/constants/container-constants', () => ({
  COMPLETE_CONTAINER_TYPE: { A: 'type-a', B: 'type-b' },
  CONTAINER_TYPE_NAME_MAP: { 'type-a': 'Type A', 'type-b': 'Type B' },
}))

vi.mock('@domain/constants/devices', () => ({
  CROSS_THING_TYPES: {
    CONTAINER: 'container',
    MINER: 'miner',
    CABINET: 'cabinet',
    POOL: 'pool',
  },
}))

describe('type filter map', () => {
  describe('TYPE_FILTER_MAP', () => {
    it('has CONTAINER, MINER, LV_CABINET and POOL keys', () => {
      expect(Object.keys(TYPE_FILTER_MAP)).toEqual(
        expect.arrayContaining(['CONTAINER', 'MINER', 'LV_CABINET', 'POOL']),
      )
    })

    it('each entry has value, label and children', () => {
      Object.values(TYPE_FILTER_MAP).forEach((filter) => {
        expect(filter).toHaveProperty('value')
        expect(filter).toHaveProperty('label')
        expect(filter).toHaveProperty('children')
        expect(Array.isArray(filter.children)).toBe(true)
      })
    })

    it('CONTAINER children are built from COMPLETE_CONTAINER_TYPE', () => {
      expect(TYPE_FILTER_MAP.CONTAINER!.children).toEqual([
        { label: 'Type A', value: 'type-a' },
        { label: 'Type B', value: 'type-b' },
      ])
    })
  })
})
