import { describe, expect, it } from 'vitest'
import {
  DATE_RANGE,
  RESPONSE_CODE,
  REVENUE_MULTIPLIER,
  TIME,
} from '../index'

describe('main constants', () => {
  describe('date ranges', () => {
    it('should have minute ranges', () => {
      expect(DATE_RANGE.M1).toBe('1m')
      expect(DATE_RANGE.M5).toBe('5m')
      expect(DATE_RANGE.M15).toBe('15m')
      expect(DATE_RANGE.M30).toBe('30m')
    })

    it('should have hour ranges', () => {
      expect(DATE_RANGE.H1).toBe('1h')
      expect(DATE_RANGE.H3).toBe('3h')
    })

    it('should have day/week/month ranges', () => {
      expect(DATE_RANGE.D1).toBe('1D')
      expect(DATE_RANGE.W1).toBe('1W')
      expect(DATE_RANGE.MONTH1).toBe('1M')
    })

    it('should have all range values defined', () => {
      const ranges = Object.values(DATE_RANGE)
      expect(ranges).toHaveLength(9)
    })
  })

  describe('revenue multiplier', () => {
    it('should have daily multiplier', () => {
      expect(REVENUE_MULTIPLIER[DATE_RANGE.D1]).toBe(24)
    })

    it('should have weekly multiplier', () => {
      expect(REVENUE_MULTIPLIER[DATE_RANGE.W1]).toBe(24 * 7)
      expect(REVENUE_MULTIPLIER[DATE_RANGE.W1]).toBe(168)
    })

    it('should have monthly multiplier', () => {
      expect(REVENUE_MULTIPLIER[DATE_RANGE.MONTH1]).toBe(24 * 30)
      expect(REVENUE_MULTIPLIER[DATE_RANGE.MONTH1]).toBe(720)
    })

    it('should have increasing multipliers', () => {
      expect(REVENUE_MULTIPLIER[DATE_RANGE.D1]).toBeLessThan(REVENUE_MULTIPLIER[DATE_RANGE.W1])
      expect(REVENUE_MULTIPLIER[DATE_RANGE.W1]).toBeLessThan(REVENUE_MULTIPLIER[DATE_RANGE.MONTH1])
    })
  })
  describe('time constants', () => {
    it('should have time constants in milliseconds', () => {
      expect(TIME.ONE_MIN).toBe(60000)
      expect(TIME.FIVE_MIN).toBe(300000)
      expect(TIME.TEN_MINS).toBe(600000)
    })

    it('should have correct time relationships', () => {
      expect(TIME.FIVE_MIN).toBe(TIME.ONE_MIN * 5)
      expect(TIME.TEN_MINS).toBe(TIME.ONE_MIN * 10)
    })

    it('should have positive time values', () => {
      Object.values(TIME).forEach((time) => {
        expect(time).toBeGreaterThan(0)
      })
    })
  })

  describe('response codes', () => {
    it('should have HTTP status codes', () => {
      expect(RESPONSE_CODE.SUCCESS).toBe(200)
      expect(RESPONSE_CODE.UNAUTHORIZED).toBe(401)
      expect(RESPONSE_CODE.FORBIDDEN).toBe(403)
      expect(RESPONSE_CODE.NOT_FOUND).toBe(404)
      expect(RESPONSE_CODE.SERVER_ERROR).toBe(500)
    })

    it('should have standard HTTP status code ranges', () => {
      expect(RESPONSE_CODE.SUCCESS).toBeGreaterThanOrEqual(200)
      expect(RESPONSE_CODE.SUCCESS).toBeLessThan(300)

      expect(RESPONSE_CODE.UNAUTHORIZED).toBeGreaterThanOrEqual(400)
      expect(RESPONSE_CODE.FORBIDDEN).toBeGreaterThanOrEqual(400)
      expect(RESPONSE_CODE.NOT_FOUND).toBeGreaterThanOrEqual(400)
      expect(RESPONSE_CODE.UNAUTHORIZED).toBeLessThan(500)

      expect(RESPONSE_CODE.SERVER_ERROR).toBeGreaterThanOrEqual(500)
    })

    it('should have all expected error codes', () => {
      const codes = Object.values(RESPONSE_CODE)
      expect(codes).toHaveLength(5)
    })
  })
})
