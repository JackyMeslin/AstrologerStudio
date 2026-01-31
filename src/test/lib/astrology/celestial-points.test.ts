/**
 * Unit Tests for Celestial Points Utilities
 *
 * Tests the celestial point utility functions and constants including icons,
 * colors, indices, sorting, and categorization.
 * These tests are completely isolated from the database (no Prisma access).
 *
 * @module src/lib/astrology/celestial-points
 */
import { describe, it, expect, vi } from 'vitest'

// Mock Prisma to ensure complete DB isolation even if imported transitively
vi.mock('@/lib/db/prisma', () => ({
  default: {},
  prisma: {},
}))

import {
  getPlanetIcon,
  getCelestialPointIndex,
  getPointColor,
  toColumnKey,
  getDisplaySortIndex,
  isClassicalPlanet,
  isChartAngle,
  ALL_CELESTIAL_POINTS,
  PLANET_ICONS,
  CELESTIAL_POINT_COLORS,
  PLANET_DISPLAY_ORDER,
  HOUSE_SYSTEMS,
  PERSPECTIVE_TYPES,
  ZODIAC_SYSTEMS,
  SIDEREAL_MODES,
} from '@/lib/astrology/celestial-points'

// ============================================================================
// getPlanetIcon Tests
// ============================================================================

describe('getPlanetIcon', () => {
  describe('core planets', () => {
    it.each([
      ['Sun', '☉'],
      ['Moon', '☽'],
      ['Mercury', '☿'],
      ['Venus', '♀'],
      ['Mars', '♂'],
      ['Jupiter', '♃'],
      ['Saturn', '♄'],
      ['Uranus', '♅'],
      ['Neptune', '♆'],
      ['Pluto', '♇'],
    ])('should return "%s" icon as "%s"', (planet, icon) => {
      expect(getPlanetIcon(planet)).toBe(icon)
    })
  })

  describe('lunar nodes', () => {
    it.each([
      ['Mean_North_Lunar_Node', '☊'],
      ['True_North_Lunar_Node', '☊'],
      ['Mean_South_Lunar_Node', '☋'],
      ['True_South_Lunar_Node', '☋'],
    ])('should return "%s" icon as "%s"', (node, icon) => {
      expect(getPlanetIcon(node)).toBe(icon)
    })
  })

  describe('chart angles', () => {
    it.each([
      ['Ascendant', 'ASC'],
      ['Medium_Coeli', 'MC'],
      ['Descendant', 'DSC'],
      ['Imum_Coeli', 'IC'],
      ['Vertex', 'Vx'],
      ['Anti_Vertex', 'AVx'],
    ])('should return "%s" icon as "%s"', (angle, icon) => {
      expect(getPlanetIcon(angle)).toBe(icon)
    })
  })

  describe('minor bodies and asteroids', () => {
    it.each([
      ['Chiron', '⚷'],
      ['Ceres', '⚳'],
      ['Pallas', '⚴'],
      ['Juno', '⚵'],
      ['Vesta', '⚶'],
    ])('should return "%s" icon as "%s"', (body, icon) => {
      expect(getPlanetIcon(body)).toBe(icon)
    })
  })

  describe('arabic parts', () => {
    it.each([
      ['Pars_Fortunae', '⊗'],
      ['Pars_Spiritus', '⊕'],
      ['Pars_Amoris', '♡'],
      ['Pars_Fidei', '✝'],
    ])('should return "%s" icon as "%s"', (part, icon) => {
      expect(getPlanetIcon(part)).toBe(icon)
    })
  })

  describe('space to underscore conversion', () => {
    it('should handle space-separated names by converting to underscores', () => {
      expect(getPlanetIcon('Mean North Lunar Node')).toBe('☊')
    })

    it('should handle space-separated arabic parts', () => {
      expect(getPlanetIcon('Pars Fortunae')).toBe('⊗')
    })
  })

  describe('edge cases - unknown points', () => {
    it('should return bullet fallback for unknown point', () => {
      expect(getPlanetIcon('UnknownPlanet')).toBe('•')
    })

    it('should return bullet fallback for empty string', () => {
      expect(getPlanetIcon('')).toBe('•')
    })

    it('should return bullet fallback for arbitrary string', () => {
      expect(getPlanetIcon('RandomName')).toBe('•')
    })
  })
})

// ============================================================================
// getCelestialPointIndex Tests
// ============================================================================

describe('getCelestialPointIndex', () => {
  describe('canonical order', () => {
    it('should return 0 for Sun (first in order)', () => {
      expect(getCelestialPointIndex('Sun')).toBe(0)
    })

    it('should return 1 for Moon (second in order)', () => {
      expect(getCelestialPointIndex('Moon')).toBe(1)
    })

    it('should return correct index for Pluto', () => {
      expect(getCelestialPointIndex('Pluto')).toBe(9)
    })

    it('should return correct index for Chiron', () => {
      expect(getCelestialPointIndex('Chiron')).toBe(14)
    })

    it('should return correct index for Ascendant', () => {
      expect(getCelestialPointIndex('Ascendant')).toBe(32)
    })
  })

  describe('all points have unique indices', () => {
    it('should return unique indices for all celestial points', () => {
      const indices = ALL_CELESTIAL_POINTS.map((point) => getCelestialPointIndex(point))
      const uniqueIndices = new Set(indices)
      expect(uniqueIndices.size).toBe(ALL_CELESTIAL_POINTS.length)
    })

    it('should return sequential indices starting from 0', () => {
      ALL_CELESTIAL_POINTS.forEach((point, expectedIndex) => {
        expect(getCelestialPointIndex(point)).toBe(expectedIndex)
      })
    })
  })

  describe('edge cases - unknown points', () => {
    it('should return MAX_SAFE_INTEGER for unknown point', () => {
      expect(getCelestialPointIndex('Unknown')).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('should return MAX_SAFE_INTEGER for empty string', () => {
      expect(getCelestialPointIndex('')).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('should return MAX_SAFE_INTEGER for typo in point name', () => {
      expect(getCelestialPointIndex('Sunn')).toBe(Number.MAX_SAFE_INTEGER)
    })
  })

  describe('sorting behavior', () => {
    it('should sort unknown points to the end', () => {
      const points = ['Pluto', 'Unknown', 'Sun', 'Moon']
      const sorted = [...points].sort((a, b) => getCelestialPointIndex(a) - getCelestialPointIndex(b))
      expect(sorted).toEqual(['Sun', 'Moon', 'Pluto', 'Unknown'])
    })
  })
})

// ============================================================================
// getPointColor Tests
// ============================================================================

describe('getPointColor', () => {
  describe('core planets - color mapping', () => {
    it('should return amber for Sun', () => {
      const color = getPointColor('Sun')
      expect(color.stroke).toBe('#f59e0b')
      expect(color.fill).toBe('#f59e0b')
    })

    it('should return gray for Moon', () => {
      const color = getPointColor('Moon')
      expect(color.stroke).toBe('#6b7280')
      expect(color.fill).toBe('#6b7280')
    })

    it('should return red for Mars', () => {
      const color = getPointColor('Mars')
      expect(color.stroke).toBe('#ef4444')
      expect(color.fill).toBe('#ef4444')
    })

    it('should return pink for Venus', () => {
      const color = getPointColor('Venus')
      expect(color.stroke).toBe('#ec4899')
      expect(color.fill).toBe('#ec4899')
    })

    it('should return purple for Jupiter', () => {
      const color = getPointColor('Jupiter')
      expect(color.stroke).toBe('#8b5cf6')
      expect(color.fill).toBe('#8b5cf6')
    })
  })

  describe('chart angles', () => {
    it('should return orange for Ascendant', () => {
      const color = getPointColor('Ascendant')
      expect(color.stroke).toBe('#f97316')
      expect(color.fill).toBe('#f97316')
    })

    it('should return yellow for Medium_Coeli', () => {
      const color = getPointColor('Medium_Coeli')
      expect(color.stroke).toBe('#facc15')
      expect(color.fill).toBe('#facc15')
    })
  })

  describe('stroke and fill consistency', () => {
    it('should have matching stroke and fill for all known points', () => {
      ALL_CELESTIAL_POINTS.forEach((point) => {
        const color = getPointColor(point)
        expect(color.stroke).toBe(color.fill)
      })
    })
  })

  describe('edge cases - unknown points', () => {
    it('should return gray fallback for unknown point', () => {
      const color = getPointColor('Unknown')
      expect(color.stroke).toBe('#6b7280')
      expect(color.fill).toBe('#6b7280')
    })

    it('should return gray fallback for empty string', () => {
      const color = getPointColor('')
      expect(color.stroke).toBe('#6b7280')
      expect(color.fill).toBe('#6b7280')
    })
  })
})

// ============================================================================
// toColumnKey Tests
// ============================================================================

describe('toColumnKey', () => {
  describe('lowercase conversion', () => {
    it('should convert Sun to lowercase', () => {
      expect(toColumnKey('Sun')).toBe('sun')
    })

    it('should convert Moon to lowercase', () => {
      expect(toColumnKey('Moon')).toBe('moon')
    })

    it('should convert underscored names to lowercase', () => {
      expect(toColumnKey('Mean_North_Lunar_Node')).toBe('mean_north_lunar_node')
    })

    it('should convert Medium_Coeli to lowercase', () => {
      expect(toColumnKey('Medium_Coeli')).toBe('medium_coeli')
    })

    it('should convert Pars_Fortunae to lowercase', () => {
      expect(toColumnKey('Pars_Fortunae')).toBe('pars_fortunae')
    })
  })

  describe('all celestial points', () => {
    it('should produce valid lowercase keys for all points', () => {
      ALL_CELESTIAL_POINTS.forEach((point) => {
        const key = toColumnKey(point)
        expect(key).toBe(key.toLowerCase())
        expect(key.length).toBeGreaterThan(0)
      })
    })
  })
})

// ============================================================================
// getDisplaySortIndex Tests
// ============================================================================

describe('getDisplaySortIndex', () => {
  describe('display order positions', () => {
    it('should return 0 for Sun (first in display order)', () => {
      expect(getDisplaySortIndex('Sun')).toBe(0)
    })

    it('should return 1 for Moon', () => {
      expect(getDisplaySortIndex('Moon')).toBe(1)
    })

    it('should return correct index for Mercury', () => {
      expect(getDisplaySortIndex('Mercury')).toBe(2)
    })

    it('should return correct index for Pluto', () => {
      expect(getDisplaySortIndex('Pluto')).toBe(9)
    })

    it('should return correct index for Chiron', () => {
      expect(getDisplaySortIndex('Chiron')).toBe(10)
    })

    it('should return correct index for Ascendant', () => {
      expect(getDisplaySortIndex('Ascendant')).toBe(14)
    })
  })

  describe('underscore to space normalization', () => {
    it('should handle True_North_Lunar_Node (converts underscores to spaces)', () => {
      expect(getDisplaySortIndex('True_North_Lunar_Node')).toBe(12)
    })

    it('should handle True North Lunar Node with spaces', () => {
      expect(getDisplaySortIndex('True North Lunar Node')).toBe(12)
    })

    it('should handle Imum_Coeli', () => {
      expect(getDisplaySortIndex('Imum_Coeli')).toBe(17)
    })

    it('should handle Mean_Lilith', () => {
      expect(getDisplaySortIndex('Mean_Lilith')).toBe(11)
    })
  })

  describe('edge cases - unknown points', () => {
    it('should return 999 for unknown point', () => {
      expect(getDisplaySortIndex('Unknown')).toBe(999)
    })

    it('should return 999 for empty string', () => {
      expect(getDisplaySortIndex('')).toBe(999)
    })

    it('should return 999 for point not in display order', () => {
      expect(getDisplaySortIndex('Eris')).toBe(999)
    })
  })

  describe('sorting behavior', () => {
    it('should sort unknown points to the end', () => {
      const points = ['Pluto', 'Unknown', 'Sun', 'Moon']
      const sorted = [...points].sort((a, b) => getDisplaySortIndex(a) - getDisplaySortIndex(b))
      expect(sorted).toEqual(['Sun', 'Moon', 'Pluto', 'Unknown'])
    })
  })
})

// ============================================================================
// isClassicalPlanet Tests
// ============================================================================

describe('isClassicalPlanet', () => {
  describe('classical (traditional) planets', () => {
    it.each(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'])('should return true for %s', (planet) => {
      expect(isClassicalPlanet(planet)).toBe(true)
    })
  })

  describe('modern planets', () => {
    it.each(['Uranus', 'Neptune', 'Pluto'])('should return false for %s', (planet) => {
      expect(isClassicalPlanet(planet)).toBe(false)
    })
  })

  describe('minor bodies', () => {
    it.each(['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta'])('should return false for %s', (body) => {
      expect(isClassicalPlanet(body)).toBe(false)
    })
  })

  describe('chart angles', () => {
    it.each(['Ascendant', 'Medium_Coeli', 'Descendant', 'Imum_Coeli'])('should return false for %s', (angle) => {
      expect(isClassicalPlanet(angle)).toBe(false)
    })
  })

  describe('lunar nodes', () => {
    it.each(['Mean_North_Lunar_Node', 'True_North_Lunar_Node'])('should return false for %s', (node) => {
      expect(isClassicalPlanet(node)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should return false for unknown point', () => {
      expect(isClassicalPlanet('Unknown')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isClassicalPlanet('')).toBe(false)
    })
  })

  describe('count verification', () => {
    it('should have exactly 7 classical planets', () => {
      const classical = ALL_CELESTIAL_POINTS.filter((p) => isClassicalPlanet(p))
      expect(classical).toHaveLength(7)
    })
  })
})

// ============================================================================
// isChartAngle Tests
// ============================================================================

describe('isChartAngle', () => {
  describe('chart angles', () => {
    it.each(['Ascendant', 'Medium_Coeli', 'Midheaven', 'Descendant', 'Imum_Coeli'])(
      'should return true for %s',
      (angle) => {
        expect(isChartAngle(angle)).toBe(true)
      },
    )
  })

  describe('underscore to space normalization', () => {
    it('should handle Medium Coeli with spaces', () => {
      expect(isChartAngle('Medium Coeli')).toBe(true)
    })

    it('should handle Imum Coeli with spaces', () => {
      expect(isChartAngle('Imum Coeli')).toBe(true)
    })
  })

  describe('non-angle points', () => {
    it('should return false for Vertex (special point, not a main angle)', () => {
      expect(isChartAngle('Vertex')).toBe(false)
    })

    it('should return false for Anti_Vertex', () => {
      expect(isChartAngle('Anti_Vertex')).toBe(false)
    })
  })

  describe('planets', () => {
    it.each(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'])('should return false for %s', (planet) => {
      expect(isChartAngle(planet)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should return false for unknown point', () => {
      expect(isChartAngle('Unknown')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isChartAngle('')).toBe(false)
    })
  })
})

// ============================================================================
// Constants Integrity Tests
// ============================================================================

describe('ALL_CELESTIAL_POINTS constant', () => {
  it('should contain all expected point categories', () => {
    // Core planets
    expect(ALL_CELESTIAL_POINTS).toContain('Sun')
    expect(ALL_CELESTIAL_POINTS).toContain('Moon')
    expect(ALL_CELESTIAL_POINTS).toContain('Pluto')

    // Lunar nodes
    expect(ALL_CELESTIAL_POINTS).toContain('Mean_North_Lunar_Node')
    expect(ALL_CELESTIAL_POINTS).toContain('True_South_Lunar_Node')

    // Centaurs
    expect(ALL_CELESTIAL_POINTS).toContain('Chiron')
    expect(ALL_CELESTIAL_POINTS).toContain('Pholus')

    // Asteroids
    expect(ALL_CELESTIAL_POINTS).toContain('Ceres')
    expect(ALL_CELESTIAL_POINTS).toContain('Vesta')

    // Chart angles
    expect(ALL_CELESTIAL_POINTS).toContain('Ascendant')
    expect(ALL_CELESTIAL_POINTS).toContain('Medium_Coeli')

    // Arabic parts
    expect(ALL_CELESTIAL_POINTS).toContain('Pars_Fortunae')
  })

  it('should have 42 celestial points total', () => {
    expect(ALL_CELESTIAL_POINTS).toHaveLength(42)
  })

  it('should have no duplicate entries', () => {
    const uniquePoints = new Set(ALL_CELESTIAL_POINTS)
    expect(uniquePoints.size).toBe(ALL_CELESTIAL_POINTS.length)
  })
})

describe('PLANET_ICONS constant', () => {
  it('should have icons for all celestial points in ALL_CELESTIAL_POINTS', () => {
    ALL_CELESTIAL_POINTS.forEach((point) => {
      const icon = PLANET_ICONS[point]
      expect(icon).toBeDefined()
      expect(typeof icon).toBe('string')
      expect(icon!.length).toBeGreaterThan(0)
    })
  })

  it('should have non-empty string icons for all entries', () => {
    Object.entries(PLANET_ICONS).forEach(([_key, icon]) => {
      expect(typeof icon).toBe('string')
      expect(icon.length).toBeGreaterThan(0)
    })
  })
})

describe('CELESTIAL_POINT_COLORS constant', () => {
  it('should have colors for all celestial points', () => {
    ALL_CELESTIAL_POINTS.forEach((point) => {
      expect(CELESTIAL_POINT_COLORS[point]).toBeDefined()
      expect(CELESTIAL_POINT_COLORS[point]).toHaveProperty('stroke')
      expect(CELESTIAL_POINT_COLORS[point]).toHaveProperty('fill')
    })
  })

  it('should have valid hex color format', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/
    Object.values(CELESTIAL_POINT_COLORS).forEach((color) => {
      expect(color.stroke).toMatch(hexColorRegex)
      expect(color.fill).toMatch(hexColorRegex)
    })
  })
})

describe('PLANET_DISPLAY_ORDER constant', () => {
  it('should have Sun and Moon as first entries (luminaries)', () => {
    expect(PLANET_DISPLAY_ORDER[0]).toBe('Sun')
    expect(PLANET_DISPLAY_ORDER[1]).toBe('Moon')
  })

  it('should follow traditional astrological ordering', () => {
    const sunIndex = PLANET_DISPLAY_ORDER.indexOf('Sun')
    const moonIndex = PLANET_DISPLAY_ORDER.indexOf('Moon')
    const saturnIndex = PLANET_DISPLAY_ORDER.indexOf('Saturn')
    const uranusIndex = PLANET_DISPLAY_ORDER.indexOf('Uranus')

    // Luminaries first
    expect(sunIndex).toBeLessThan(saturnIndex)
    expect(moonIndex).toBeLessThan(saturnIndex)

    // Classical planets before modern
    expect(saturnIndex).toBeLessThan(uranusIndex)
  })

  it('should have 20 entries in display order', () => {
    expect(PLANET_DISPLAY_ORDER).toHaveLength(20)
  })
})

describe('HOUSE_SYSTEMS constant', () => {
  it('should have common house systems', () => {
    const values = HOUSE_SYSTEMS.map((h) => h.value)
    expect(values).toContain('P') // Placidus
    expect(values).toContain('K') // Koch
    expect(values).toContain('W') // Whole Sign
    expect(values).toContain('A') // Equal
  })

  it('should have labels for all house systems', () => {
    HOUSE_SYSTEMS.forEach((system) => {
      expect(system).toHaveProperty('value')
      expect(system).toHaveProperty('label')
      expect(typeof system.value).toBe('string')
      expect(typeof system.label).toBe('string')
    })
  })

  it('should have 10 house systems', () => {
    expect(HOUSE_SYSTEMS).toHaveLength(10)
  })
})

describe('PERSPECTIVE_TYPES constant', () => {
  it('should have geocentric and heliocentric perspectives', () => {
    const values = PERSPECTIVE_TYPES.map((p) => p.value)
    expect(values).toContain('Apparent Geocentric')
    expect(values).toContain('Heliocentric')
  })

  it('should have 2 perspective types', () => {
    expect(PERSPECTIVE_TYPES).toHaveLength(2)
  })
})

describe('ZODIAC_SYSTEMS constant', () => {
  it('should have tropical and sidereal systems', () => {
    const values = ZODIAC_SYSTEMS.map((z) => z.value)
    expect(values).toContain('Tropical')
    expect(values).toContain('Sidereal')
  })

  it('should have 2 zodiac systems', () => {
    expect(ZODIAC_SYSTEMS).toHaveLength(2)
  })
})

describe('SIDEREAL_MODES constant', () => {
  it('should contain common ayanamsas', () => {
    expect(SIDEREAL_MODES).toContain('LAHIRI')
    expect(SIDEREAL_MODES).toContain('FAGAN_BRADLEY')
    expect(SIDEREAL_MODES).toContain('RAMAN')
    expect(SIDEREAL_MODES).toContain('KRISHNAMURTI')
  })

  it('should have 20 sidereal modes', () => {
    expect(SIDEREAL_MODES).toHaveLength(20)
  })

  it('should have all uppercase mode names', () => {
    SIDEREAL_MODES.forEach((mode) => {
      expect(mode).toBe(mode.toUpperCase())
    })
  })
})
