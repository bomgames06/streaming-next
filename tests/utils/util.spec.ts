import { describe, expect, it } from 'vitest'
import { generateState, isSameCategoryName, partition, twitchDurationToSeconds } from '@/utils/util'
import { resolveLocale } from '@/plugins/i18n'

describe('util.ts', () => {
  describe('partition', () => {
    it('Split collection in chunks', () => {
      expect(partition([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]])
    })
    it('Return no chunk for empty collection', () => {
      // An empty chunk would make the Twitch API return the authenticated user or a 400
      expect(partition([], 100)).toStrictEqual([])
    })
  })
  describe('generateState', () => {
    it('Generate alphanumeric value with the requested size', () => {
      expect(generateState()).toMatch(/^[a-zA-Z0-9]{50}$/)
      expect(generateState(10)).toMatch(/^[a-zA-Z0-9]{10}$/)
    })
  })
  describe('isSameCategoryName', () => {
    it('Compare ignoring case', () => {
      expect(isSameCategoryName('Just Chatting', 'just chatting')).toBe(true)
      expect(isSameCategoryName('Just Chatting', 'Minecraft')).toBe(false)
    })
    it('Never match empty names', () => {
      expect(isSameCategoryName('', '')).toBe(false)
      expect(isSameCategoryName(undefined, 'Minecraft')).toBe(false)
    })
  })
  describe('twitchDurationToSeconds', () => {
    it('Convert Twitch duration', () => {
      expect(twitchDurationToSeconds('1h2m3s')).toBe(3723)
      expect(twitchDurationToSeconds('45s')).toBe(45)
      expect(twitchDurationToSeconds('invalid')).toBe(0)
    })
  })
  describe('resolveLocale', () => {
    it('Resolve to a supported locale', () => {
      expect(resolveLocale('pt-BR')).toBe('pt-BR')
      expect(resolveLocale('pt')).toBe('pt-BR')
      expect(resolveLocale('pt-PT')).toBe('pt-BR')
      expect(resolveLocale('en-US')).toBe('en')
      expect(resolveLocale('es-ES')).toBeUndefined()
      expect(resolveLocale(undefined)).toBeUndefined()
    })
  })
})
