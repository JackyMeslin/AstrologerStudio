/**
 * Unit Tests for Aspect Utilities
 *
 * Tests the aspect-related utility functions including symbols, colors, sizes, and orbs.
 * These tests are completely isolated from the database (no Prisma access).
 *
 * @module src/lib/astrology/aspects
 */
import { describe, it, expect, vi } from 'vitest'

// Mock Prisma to ensure complete DB isolation even if imported transitively
vi.mock('@/lib/db/prisma', () => ({
  default: {},
  prisma: {},
}))

import {
  getAspectSymbol,
  getAspectColor,
  getAspectTextColor,
  getAspectTextSize,
  isMajorAspect,
  getDefaultOrb,
  ALL_ASPECTS,
  ASPECT_SYMBOLS,
} from '@/lib/astrology/aspects'

// ============================================================================
// getAspectSymbol Tests
// ============================================================================

describe('getAspectSymbol', () => {
  describe('nominal cases - known aspects', () => {
    it.each([
      ['conjunction', '☌'],
      ['opposition', '☍'],
      ['trine', '△'],
      ['square', '□'],
      ['sextile', '⚹'],
      ['quincunx', '⚻'],
      ['semi-sextile', '⚺'],
      ['semi-square', '∠'],
      ['sesquiquadrate', '⚼'],
      ['quintile', 'Q'],
      ['biquintile', 'bQ'],
      ['bi-quintile', 'bQ'],
    ])('should return "%s" symbol as "%s"', (aspect, symbol) => {
      expect(getAspectSymbol(aspect)).toBe(symbol)
    })
  })

  describe('case insensitivity', () => {
    it.each([
      ['CONJUNCTION', '☌'],
      ['Trine', '△'],
      ['SQUARE', '□'],
      ['SexTiLe', '⚹'],
    ])('should handle "%s" (mixed case) returning "%s"', (aspect, symbol) => {
      expect(getAspectSymbol(aspect)).toBe(symbol)
    })
  })

  describe('edge cases - unknown aspects', () => {
    it('should return first character capitalized for unknown aspect', () => {
      expect(getAspectSymbol('unknown')).toBe('U')
    })

    it('should return first character capitalized for arbitrary string', () => {
      expect(getAspectSymbol('mysteryaspect')).toBe('M')
    })

    it('should handle empty string gracefully', () => {
      expect(getAspectSymbol('')).toBe('')
    })
  })
})

// ============================================================================
// getAspectColor Tests
// ============================================================================

describe('getAspectColor', () => {
  describe('major aspects - color conventions', () => {
    it('should return blue for conjunction (neutral)', () => {
      expect(getAspectColor('conjunction')).toBe('bg-blue-500')
    })

    it('should return red for opposition (challenging)', () => {
      expect(getAspectColor('opposition')).toBe('bg-red-500')
    })

    it('should return red for square (challenging)', () => {
      expect(getAspectColor('square')).toBe('bg-red-500')
    })

    it('should return green for trine (harmonious)', () => {
      expect(getAspectColor('trine')).toBe('bg-green-500')
    })

    it('should return green for sextile (harmonious)', () => {
      expect(getAspectColor('sextile')).toBe('bg-green-500')
    })
  })

  describe('minor aspects', () => {
    it('should return light blue for semi-sextile', () => {
      expect(getAspectColor('semi-sextile')).toBe('bg-blue-400')
    })

    it('should return light red for semi-square', () => {
      expect(getAspectColor('semi-square')).toBe('bg-red-400')
    })

    it('should return light red for sesquiquadrate', () => {
      expect(getAspectColor('sesquiquadrate')).toBe('bg-red-400')
    })

    it('should return purple for quincunx', () => {
      expect(getAspectColor('quincunx')).toBe('bg-purple-500')
    })

    it('should return orange for quintile', () => {
      expect(getAspectColor('quintile')).toBe('bg-orange-500')
    })

    it('should return orange for biquintile', () => {
      expect(getAspectColor('biquintile')).toBe('bg-orange-500')
    })

    it('should return orange for bi-quintile', () => {
      expect(getAspectColor('bi-quintile')).toBe('bg-orange-500')
    })
  })

  describe('color coherence', () => {
    it('should have consistent colors: harmonious aspects are green', () => {
      const harmoniousAspects = ['trine', 'sextile']
      harmoniousAspects.forEach((aspect) => {
        expect(getAspectColor(aspect)).toContain('green')
      })
    })

    it('should have consistent colors: challenging major aspects are red-500', () => {
      const challengingAspects = ['opposition', 'square']
      challengingAspects.forEach((aspect) => {
        expect(getAspectColor(aspect)).toBe('bg-red-500')
      })
    })

    it('should have consistent colors: challenging minor aspects are red-400', () => {
      const challengingMinor = ['semi-square', 'sesquiquadrate']
      challengingMinor.forEach((aspect) => {
        expect(getAspectColor(aspect)).toBe('bg-red-400')
      })
    })
  })

  describe('case insensitivity', () => {
    it('should handle uppercase aspect names', () => {
      expect(getAspectColor('TRINE')).toBe('bg-green-500')
    })

    it('should handle mixed case aspect names', () => {
      expect(getAspectColor('Opposition')).toBe('bg-red-500')
    })
  })

  describe('edge cases - unknown aspects', () => {
    it('should return gray for unknown aspect', () => {
      expect(getAspectColor('unknown')).toBe('bg-gray-500')
    })

    it('should return gray for empty string', () => {
      expect(getAspectColor('')).toBe('bg-gray-500')
    })
  })
})

// ============================================================================
// getAspectTextColor Tests
// ============================================================================

describe('getAspectTextColor', () => {
  describe('major aspects', () => {
    it.each([
      ['conjunction', 'text-blue-600'],
      ['opposition', 'text-red-600'],
      ['square', 'text-red-600'],
      ['trine', 'text-green-600'],
      ['sextile', 'text-green-600'],
    ])('should return correct text color for %s', (aspect, color) => {
      expect(getAspectTextColor(aspect)).toBe(color)
    })
  })

  describe('minor aspects', () => {
    it.each([
      ['semi-sextile', 'text-blue-500'],
      ['semi-square', 'text-red-500'],
      ['sesquiquadrate', 'text-red-500'],
      ['quincunx', 'text-purple-500'],
      ['quintile', 'text-orange-600'],
      ['biquintile', 'text-orange-600'],
      ['bi-quintile', 'text-orange-600'],
    ])('should return correct text color for %s', (aspect, color) => {
      expect(getAspectTextColor(aspect)).toBe(color)
    })
  })

  describe('color coherence with background colors', () => {
    it('should use matching color families for bg and text', () => {
      const aspects = ['conjunction', 'trine', 'square', 'quincunx']
      aspects.forEach((aspect) => {
        const bgColor = getAspectColor(aspect)
        const textColor = getAspectTextColor(aspect)
        // Extract color name (e.g., 'blue' from 'bg-blue-500')
        const bgColorName = bgColor.split('-')[1]
        const textColorName = textColor.split('-')[1]
        expect(bgColorName).toBe(textColorName)
      })
    })
  })

  describe('edge cases', () => {
    it('should return gray for unknown aspect', () => {
      expect(getAspectTextColor('unknown')).toBe('text-gray-600')
    })

    it('should handle case insensitivity', () => {
      expect(getAspectTextColor('TRINE')).toBe('text-green-600')
    })
  })
})

// ============================================================================
// getAspectTextSize Tests
// ============================================================================

describe('getAspectTextSize', () => {
  describe('special size adjustments', () => {
    it('should return text-xs for biquintile (bQ is large)', () => {
      expect(getAspectTextSize('biquintile')).toBe('text-xs')
    })

    it('should return text-xs for bi-quintile', () => {
      expect(getAspectTextSize('bi-quintile')).toBe('text-xs')
    })

    it('should return text-xl for opposition (symbol is small)', () => {
      expect(getAspectTextSize('opposition')).toBe('text-xl')
    })
  })

  describe('default size', () => {
    it.each(['conjunction', 'trine', 'square', 'sextile', 'quincunx', 'quintile', 'semi-sextile'])(
      'should return text-lg for %s',
      (aspect) => {
        expect(getAspectTextSize(aspect)).toBe('text-lg')
      },
    )
  })

  describe('case insensitivity', () => {
    it('should handle uppercase', () => {
      expect(getAspectTextSize('BIQUINTILE')).toBe('text-xs')
    })

    it('should handle mixed case', () => {
      expect(getAspectTextSize('Opposition')).toBe('text-xl')
    })
  })

  describe('edge cases', () => {
    it('should return default text-lg for unknown aspect', () => {
      expect(getAspectTextSize('unknown')).toBe('text-lg')
    })
  })
})

// ============================================================================
// isMajorAspect Tests
// ============================================================================

describe('isMajorAspect', () => {
  describe('major (Ptolemaic) aspects', () => {
    it.each(['conjunction', 'opposition', 'trine', 'square', 'sextile'])('should return true for %s', (aspect) => {
      expect(isMajorAspect(aspect)).toBe(true)
    })
  })

  describe('minor aspects', () => {
    it.each(['quintile', 'semi-sextile', 'semi-square', 'sesquiquadrate', 'biquintile', 'quincunx'])(
      'should return false for %s',
      (aspect) => {
        expect(isMajorAspect(aspect)).toBe(false)
      },
    )
  })

  describe('case insensitivity', () => {
    it('should return true for uppercase TRINE', () => {
      expect(isMajorAspect('TRINE')).toBe(true)
    })

    it('should return true for mixed case Conjunction', () => {
      expect(isMajorAspect('Conjunction')).toBe(true)
    })

    it('should return false for uppercase QUINCUNX', () => {
      expect(isMajorAspect('QUINCUNX')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should return false for unknown aspect', () => {
      expect(isMajorAspect('unknown')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isMajorAspect('')).toBe(false)
    })
  })

  describe('count verification', () => {
    it('should have exactly 5 major aspects', () => {
      const majorAspects = ALL_ASPECTS.filter((a) => isMajorAspect(a.name))
      expect(majorAspects).toHaveLength(5)
    })

    it('should have exactly 6 minor aspects in ALL_ASPECTS', () => {
      const minorAspects = ALL_ASPECTS.filter((a) => !isMajorAspect(a.name))
      expect(minorAspects).toHaveLength(6)
    })
  })
})

// ============================================================================
// getDefaultOrb Tests
// ============================================================================

describe('getDefaultOrb', () => {
  describe('major aspects - larger orbs', () => {
    it.each([
      ['conjunction', 10],
      ['opposition', 10],
      ['trine', 8],
      ['square', 5],
      ['sextile', 6],
    ])('should return %d degrees for %s', (aspect, orb) => {
      expect(getDefaultOrb(aspect)).toBe(orb)
    })
  })

  describe('minor aspects - smaller orbs', () => {
    it.each([
      ['quintile', 1],
      ['semi-sextile', 1],
      ['semi-square', 1],
      ['sesquiquadrate', 1],
      ['biquintile', 1],
      ['quincunx', 1],
    ])('should return %d degree for %s', (aspect, orb) => {
      expect(getDefaultOrb(aspect)).toBe(orb)
    })
  })

  describe('major vs minor orb differences', () => {
    it('should have larger orbs for major aspects than minor', () => {
      const majorOrbs = ['conjunction', 'opposition', 'trine', 'square', 'sextile'].map(getDefaultOrb)
      const minorOrbs = ['quintile', 'semi-sextile', 'quincunx'].map(getDefaultOrb)

      const minMajorOrb = Math.min(...majorOrbs)
      const maxMinorOrb = Math.max(...minorOrbs)

      expect(minMajorOrb).toBeGreaterThan(maxMinorOrb)
    })
  })

  describe('case sensitivity', () => {
    it('should handle lowercase (matches ALL_ASPECTS)', () => {
      expect(getDefaultOrb('conjunction')).toBe(10)
    })

    it('should handle uppercase via lowercase conversion', () => {
      expect(getDefaultOrb('CONJUNCTION')).toBe(10)
    })

    it('should handle mixed case', () => {
      expect(getDefaultOrb('Trine')).toBe(8)
    })
  })

  describe('edge cases - unknown aspects', () => {
    it('should return 1 for unknown aspect', () => {
      expect(getDefaultOrb('unknown')).toBe(1)
    })

    it('should return 1 for empty string', () => {
      expect(getDefaultOrb('')).toBe(1)
    })

    it('should return 1 for typo in aspect name', () => {
      expect(getDefaultOrb('conjuction')).toBe(1) // typo
    })
  })
})

// ============================================================================
// Constants Integrity Tests
// ============================================================================

describe('ALL_ASPECTS constant', () => {
  it('should contain 11 aspects', () => {
    expect(ALL_ASPECTS).toHaveLength(11)
  })

  it('should have all aspects with name and defaultOrb', () => {
    ALL_ASPECTS.forEach((aspect) => {
      expect(aspect).toHaveProperty('name')
      expect(aspect).toHaveProperty('defaultOrb')
      expect(typeof aspect.name).toBe('string')
      expect(typeof aspect.defaultOrb).toBe('number')
    })
  })

  it('should have all lowercase aspect names', () => {
    ALL_ASPECTS.forEach((aspect) => {
      expect(aspect.name).toBe(aspect.name.toLowerCase())
    })
  })
})

describe('ASPECT_SYMBOLS constant', () => {
  it('should have symbols for all major aspects', () => {
    const majorAspects = ['conjunction', 'opposition', 'trine', 'square', 'sextile']
    majorAspects.forEach((aspect) => {
      expect(ASPECT_SYMBOLS[aspect]).toBeDefined()
    })
  })

  it('should have non-empty string symbols', () => {
    Object.values(ASPECT_SYMBOLS).forEach((symbol) => {
      expect(typeof symbol).toBe('string')
      expect(symbol.length).toBeGreaterThan(0)
    })
  })
})
