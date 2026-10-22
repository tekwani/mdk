import { describe, expect, it } from 'vitest'
import { hexToRgb, hexToRgba, rgbToHex } from '../color'

describe('hexToRgba', () => {
  it.each([
    ['#FF5733', 0.5, 'rgba(255, 87, 51, 0.5)'],
    ['FF5733', 0.5, 'rgba(255, 87, 51, 0.5)'],
    ['#ff5733', 0.5, 'rgba(255, 87, 51, 0.5)'],
    ['aabbcc', 0.8, 'rgba(170, 187, 204, 0.8)'],
    ['#000000', 1, 'rgba(0, 0, 0, 1)'],
    ['#FFFFFF', 0, 'rgba(255, 255, 255, 0)'],
  ])('converts %s with opacity %s', (hex, opacity, expected) => {
    expect(hexToRgba(hex, opacity)).toBe(expected)
  })

  it('supports shorthand hex (#fff)', () => {
    expect(hexToRgba('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)')
    expect(hexToRgba('000', 1)).toBe('rgba(0, 0, 0, 1)')
  })

  it('returns original value for invalid hex', () => {
    expect(hexToRgba('invalid', 0.5)).toBe('invalid')
    expect(hexToRgba('#GGG', 0.5)).toBe('#GGG')
    expect(hexToRgba('', 0.5)).toBe('')
  })

  it('clamps opacity between 0 and 1', () => {
    expect(hexToRgba('#FF0000', -1)).toBe('rgba(255, 0, 0, 0)')
    expect(hexToRgba('#FF0000', 2)).toBe('rgba(255, 0, 0, 1)')
  })

  it('defaults opacity to 1 when omitted', () => {
    expect(hexToRgba('#FF0000')).toBe('rgba(255, 0, 0, 1)')
  })

  it('trims surrounding whitespace before parsing', () => {
    expect(hexToRgba('  #00ff00  ', 0.5)).toBe('rgba(0, 255, 0, 0.5)')
  })

  it('throws a TypeError when given a non-string value', () => {
    expect(() => hexToRgba(null as unknown as string, 0.5)).toThrow(TypeError)
    expect(() => hexToRgba(undefined as unknown as string, 0.5)).toThrow(TypeError)
    expect(() => hexToRgba(123 as unknown as string, 0.5)).toThrow(TypeError)
  })
})

describe('hexToRgb', () => {
  it.each([
    ['#ff0000', { r: 255, g: 0, b: 0 }],
    ['#00ff00', { r: 0, g: 255, b: 0 }],
    ['#0000ff', { r: 0, g: 0, b: 255 }],
    ['#000000', { r: 0, g: 0, b: 0 }],
    ['#ffffff', { r: 255, g: 255, b: 255 }],
    ['#aabbcc', { r: 170, g: 187, b: 204 }],
  ])('parses 6-digit hex %s', (hex, expected) => {
    expect(hexToRgb(hex)).toEqual(expected)
  })

  it('parses hex without a leading "#"', () => {
    expect(hexToRgb('ff8800')).toEqual({ r: 255, g: 136, b: 0 })
  })

  it('expands 3-digit shorthand to 6-digit hex', () => {
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 })
    expect(hexToRgb('#abc')).toEqual({ r: 170, g: 187, b: 204 })
    expect(hexToRgb('fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('is case-insensitive', () => {
    expect(hexToRgb('#FFAA00')).toEqual(hexToRgb('#ffaa00'))
  })

  it('returns black for invalid hex lengths', () => {
    expect(hexToRgb('#ab')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#abcd')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#ff0000ee')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('returns black for invalid hex characters', () => {
    expect(hexToRgb('#gggggg')).toEqual({ r: 0, g: 0, b: 0 })
  })
})

describe('rgbToHex', () => {
  it.each([
    [{ r: 255, g: 0, b: 0 }, '#ff0000'],
    [{ r: 0, g: 255, b: 0 }, '#00ff00'],
    [{ r: 0, g: 0, b: 255 }, '#0000ff'],
    [{ r: 0, g: 0, b: 0 }, '#000000'],
    [{ r: 255, g: 255, b: 255 }, '#ffffff'],
    [{ r: 170, g: 187, b: 204 }, '#aabbcc'],
  ])('serialises %j as %s', (input, expected) => {
    expect(rgbToHex(input)).toBe(expected)
  })

  it('zero-pads small channel values to keep 6 hex characters', () => {
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe('#010203')
  })

  it('round-trips through hexToRgb', () => {
    const original = '#3a7bff'
    expect(rgbToHex(hexToRgb(original))).toBe(original)
  })
})
