import { describe, expect, it } from 'vitest'
import { parseDollars } from './money'

describe('parseDollars', () => {
  it('parses common inputs exactly', () => {
    expect(parseDollars('72.43')).toBe(7243)
    expect(parseDollars('$1,200')).toBe(120000)
    expect(parseDollars('5')).toBe(500)
    expect(parseDollars('0.1')).toBe(10)
    expect(parseDollars('19.99')).toBe(1999)
  })
  it('rejects bad input', () => {
    expect(parseDollars('')).toBeNull()
    expect(parseDollars('abc')).toBeNull()
    expect(parseDollars('1.234')).toBeNull()
    expect(parseDollars('-5')).toBeNull()
  })
})