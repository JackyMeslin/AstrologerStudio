/**
 * Unit Tests for Planet Formatting Utilities
 *
 * Tests the planet name formatting functions for display purposes.
 *
 * @module src/lib/astrology/planet-formatting
 */
import { describe, it, expect } from 'vitest'
import { formatPlanetName, formatPlanetNameShort } from '@/lib/astrology/planet-formatting'

// ============================================================================
// formatPlanetName Tests
// ============================================================================

describe('formatPlanetName', () => {
  describe('simplified lunar nodes', () => {
    it.each([
      ['True_Node', 'North Node'],
      ['True Node', 'North Node'],
      ['Mean_Node', 'North Node (Mean)'],
      ['Mean Node', 'North Node (Mean)'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetName(input)).toBe(expected)
    })
  })

  describe('full lunar node names', () => {
    it.each([
      ['True_North_Lunar_Node', 'North Node (T)'],
      ['True North Lunar Node', 'North Node (T)'],
      ['True_South_Lunar_Node', 'South Node (T)'],
      ['True South Lunar Node', 'South Node (T)'],
      ['Mean_North_Lunar_Node', 'North Node (M)'],
      ['Mean North Lunar Node', 'North Node (M)'],
      ['Mean_South_Lunar_Node', 'South Node (M)'],
      ['Mean South Lunar Node', 'South Node (M)'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetName(input)).toBe(expected)
    })
  })

  describe('Lilith variants', () => {
    it.each([
      ['Mean_Lilith', 'Lilith (M)'],
      ['Mean Lilith', 'Lilith (M)'],
      ['True_Lilith', 'Black Moon Lilith'],
      ['True Lilith', 'Black Moon Lilith'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetName(input)).toBe(expected)
    })
  })

  describe('Arabic Parts', () => {
    it.each([
      ['Pars_Fortunae', 'Part of Fortune'],
      ['Pars Fortunae', 'Part of Fortune'],
      ['Pars_Spiritus', 'Part of Spirit'],
      ['Pars Spiritus', 'Part of Spirit'],
      ['Pars_Amoris', 'Part of Love'],
      ['Pars Amoris', 'Part of Love'],
      ['Pars_Fidei', 'Part of Faith'],
      ['Pars Fidei', 'Part of Faith'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetName(input)).toBe(expected)
    })
  })

  describe('chart angles', () => {
    it.each([
      ['Asc', 'Ascendant'],
      ['Mc', 'Midheaven'],
      ['Medium_Coeli', 'Midheaven (MC)'],
      ['Medium Coeli', 'Midheaven (MC)'],
      ['Imum_Coeli', 'Imum Coeli (IC)'],
      ['Imum Coeli', 'Imum Coeli (IC)'],
      ['Anti_Vertex', 'Anti-Vertex'],
      ['Anti Vertex', 'Anti-Vertex'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetName(input)).toBe(expected)
    })
  })

  describe('default formatting', () => {
    it.each([
      ['Unknown', 'Unknown'],
      ['some_planet_name', 'Some Planet Name'],
      ['jupiter', 'Jupiter'],
    ])('should format "%s" as "%s" using default rules', (input, expected) => {
      expect(formatPlanetName(input)).toBe(expected)
    })
  })
})

// ============================================================================
// formatPlanetNameShort Tests
// ============================================================================

describe('formatPlanetNameShort', () => {
  describe('core planets', () => {
    it.each([
      ['Sun', 'Su'],
      ['Moon', 'Mo'],
      ['Mercury', 'Me'],
      ['Venus', 'Ve'],
      ['Mars', 'Ma'],
      ['Jupiter', 'Ju'],
      ['Saturn', 'Sa'],
      ['Uranus', 'Ur'],
      ['Neptune', 'Ne'],
      ['Pluto', 'Pl'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetNameShort(input)).toBe(expected)
    })
  })

  describe('lunar nodes', () => {
    it.each([
      ['True_North_Lunar_Node', 'NN'],
      ['Mean_North_Lunar_Node', 'NN'],
      ['True_South_Lunar_Node', 'SN'],
      ['Mean_South_Lunar_Node', 'SN'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetNameShort(input)).toBe(expected)
    })
  })

  describe('Lilith', () => {
    it.each([
      ['Mean_Lilith', 'Li'],
      ['True_Lilith', 'Li'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetNameShort(input)).toBe(expected)
    })
  })

  describe('asteroids and centaurs', () => {
    it.each([
      ['Chiron', 'Ch'],
      ['Ceres', 'Ce'],
      ['Pallas', 'Pa'],
      ['Juno', 'Jn'],
      ['Vesta', 'Vs'],
      ['Pholus', 'Ph'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetNameShort(input)).toBe(expected)
    })
  })

  describe('angles', () => {
    it.each([
      ['Ascendant', 'Asc'],
      ['Medium_Coeli', 'MC'],
      ['Descendant', 'Dsc'],
      ['Imum_Coeli', 'IC'],
      ['Vertex', 'Vx'],
      ['Anti_Vertex', 'AVx'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetNameShort(input)).toBe(expected)
    })
  })

  describe('Arabic parts', () => {
    it.each([
      ['Pars_Fortunae', 'PoF'],
      ['Part_of_Fortune', 'PoF'],
      ['Pars_Spiritus', 'PoS'],
      ['Part_of_Spirit', 'PoS'],
      ['Pars_Amoris', 'PoL'],
      ['Part_of_Love', 'PoL'],
      ['Pars_Fidei', 'PoFa'],
      ['Part_of_Faith', 'PoFa'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetNameShort(input)).toBe(expected)
    })
  })

  describe('dwarf planets', () => {
    it.each([
      ['Eris', 'Er'],
      ['Sedna', 'Se'],
      ['Haumea', 'Ha'],
      ['Makemake', 'Mk'],
      ['Ixion', 'Ix'],
      ['Orcus', 'Or'],
      ['Quaoar', 'Qu'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetNameShort(input)).toBe(expected)
    })
  })

  describe('fixed stars', () => {
    it.each([
      ['Regulus', 'Reg'],
      ['Spica', 'Spi'],
    ])('should format "%s" as "%s"', (input, expected) => {
      expect(formatPlanetNameShort(input)).toBe(expected)
    })
  })

  describe('other points', () => {
    it.each([
      ['Earth', 'Ea'],
      ['Unknown_Point', 'Un'],
    ])('should format "%s" as "%s" (fallback)', (input, expected) => {
      expect(formatPlanetNameShort(input)).toBe(expected)
    })
  })
})
