import { describe, it, expect } from 'vitest'
import { toTitleCase } from './utils'

describe('General Utils - toTitleCase', () => {
  it('should capitalize the first letter of each word', () => {
    expect(toTitleCase('hello world')).toBe('Hello World')
  })

  it('should handle Turkish specific characters correctly', () => {
    // lowercase 'i' becomes uppercase 'İ' in Turkish Title Case
    expect(toTitleCase('istanbul')).toBe('İstanbul')
    // lowercase 'ı' becomes uppercase 'I'
    expect(toTitleCase('ılık')).toBe('Ilık')
    // lowercase 'ş' becomes uppercase 'Ş'
    expect(toTitleCase('şeker')).toBe('Şeker')
  })

  it('should handle already capitalized strings', () => {
    expect(toTitleCase('ISTANBUL')).toBe('Istanbul')
    expect(toTitleCase('İSTANBUL')).toBe('İstanbul')
  })

  it('should handle mixed case strings', () => {
    expect(toTitleCase('tÜrKiYe')).toBe('Türkiye')
  })

  it('should handle multiple spaces', () => {
    // The current implementation might return empty strings between spaces if not handled
    // split(' ') on 'a  b' returns ['a', '', 'b']
    // map('', index 0) returns ''
    // join(' ') returns 'a  b'
    // Let's verify
    expect(toTitleCase('besiktas  veteriner')).toBe('Besiktas  Veteriner')
  })

  it('should return empty string for null/empty input', () => {
    expect(toTitleCase('')).toBe('')
  })
})
