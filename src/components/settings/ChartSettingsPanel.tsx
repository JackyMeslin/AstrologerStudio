'use client'

import { ALL_ASPECTS, isMajorAspect } from '@/lib/astrology/aspects'
import { type ChartPreferencesData } from '@/actions/preferences'

// Re-export section components for use in settings page
export { AppearanceSection, CalculationSection, PointsAspectsSection } from './chart'
export type { ChartSettingsSectionProps } from './chart'

/**
 * Default chart preferences used when user has no saved preferences.
 */
export const DEFAULT_PREFERENCES: ChartPreferencesData = {
  theme: 'classic',

  date_format: 'EU',
  time_format: '24h',
  show_aspect_icons: true,

  show_degree_indicators: true,
  distribution_method: 'weighted',
  active_points: [
    'Sun',
    'Moon',
    'Mercury',
    'Venus',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
    'Pluto',
    'True_North_Lunar_Node',
    'True_South_Lunar_Node',
    'Ascendant',
    'Medium_Coeli',
  ],
  active_aspects: ALL_ASPECTS.filter((a) => isMajorAspect(a.name)).map((a) => ({ name: a.name, orb: a.defaultOrb })),
  custom_distribution_weights: {},

  default_zodiac_system: 'Tropical',
  default_sidereal_mode: 'LAHIRI',
  house_system: 'P', // Default to Placidus code
  perspective_type: 'Apparent Geocentric', // Default to Apparent Geocentric
  rulership_mode: 'modern',
}
