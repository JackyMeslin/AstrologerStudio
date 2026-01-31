import { z } from 'zod'
import { ALL_CELESTIAL_POINTS } from '@/lib/astrology/celestial-points'
import { ALL_ASPECTS } from '@/lib/astrology/aspects'

/**
 * Valid house system codes (single letter identifiers)
 */
const HOUSE_SYSTEM_CODES = ['P', 'K', 'W', 'A', 'R', 'C', 'O', 'M', 'T', 'B'] as const

/**
 * Valid perspective types for chart calculations
 */
const PERSPECTIVE_TYPES = ['Apparent Geocentric', 'Heliocentric', 'True Geocentric'] as const

/**
 * Valid zodiac systems
 */
const ZODIAC_SYSTEMS = ['Tropical', 'Sidereal'] as const

/**
 * Valid sidereal modes (ayanamsas)
 */
const SIDEREAL_MODES = [
  'LAHIRI',
  'FAGAN_BRADLEY',
  'DELUCE',
  'RAMAN',
  'USHASHASHI',
  'KRISHNAMURTI',
  'DJWHAL_KHUL',
  'YUKTESHWAR',
  'JN_BHASIN',
  'BABYL_KUGLER1',
  'BABYL_KUGLER2',
  'BABYL_KUGLER3',
  'BABYL_HUBER',
  'BABYL_ETPSC',
  'ALDEBARAN_15TAU',
  'HIPPARCHOS',
  'SASSANIAN',
  'J2000',
  'J1900',
  'B1950',
] as const

/**
 * Valid distribution methods for element/quality calculations
 */
const DISTRIBUTION_METHODS = ['weighted', 'pure_count'] as const

/**
 * Valid aspect names (lowercase)
 */
const ASPECT_NAMES = ALL_ASPECTS.map((a) => a.name)

/**
 * Schema for a single active aspect configuration
 */
const activeAspectSchema = z.object({
  name: z.string().refine((val) => ASPECT_NAMES.includes(val.toLowerCase()), {
    message: 'Invalid aspect name',
  }),
  orb: z.number().min(0, 'Orb must be non-negative').max(30, 'Orb cannot exceed 30 degrees'),
})

/**
 * Schema for custom distribution weights
 * Keys are celestial point names (lowercase), values are numeric weights
 */
const customDistributionWeightsSchema = z
  .record(
    z.string().max(50, 'Weight key too long'),
    z.number().min(0, 'Weight must be non-negative').max(100, 'Weight cannot exceed 100'),
  )
  .refine((obj) => Object.keys(obj).length <= 50, {
    message: 'Too many weight entries (max 50)',
  })

/**
 * Zod schema for validating chart preferences updates.
 *
 * All fields are optional since this is used for partial updates.
 * Each field has appropriate constraints to prevent:
 * - Invalid enum values
 * - Out-of-range numbers
 * - Oversized strings/arrays
 * - Malformed structures
 */
export const chartPreferencesUpdateSchema = z
  .object({
    /** Visual theme (max 50 chars to prevent abuse) */
    theme: z.string().min(1, 'Theme cannot be empty').max(50, 'Theme name too long'),

    /** Date display format */
    date_format: z.enum(['US', 'EU', 'ISO'], {
      message: 'Invalid date format. Must be US, EU, or ISO',
    }),

    /** Time display format */
    time_format: z.enum(['12h', '24h'], {
      message: 'Invalid time format. Must be 12h or 24h',
    }),

    /** Show aspect icons on chart */
    show_aspect_icons: z.boolean(),

    /** Show degree indicators on chart */
    show_degree_indicators: z.boolean(),

    /** Distribution calculation method */
    distribution_method: z.enum(DISTRIBUTION_METHODS, {
      message: 'Invalid distribution method. Must be weighted or pure_count',
    }),

    /** Active celestial points for chart calculation */
    active_points: z
      .array(
        z.string().refine((val) => ALL_CELESTIAL_POINTS.includes(val as (typeof ALL_CELESTIAL_POINTS)[number]), {
          message: 'Invalid celestial point name',
        }),
      )
      .max(50, 'Too many active points (max 50)'),

    /** Active aspects with custom orbs */
    active_aspects: z.array(activeAspectSchema).max(20, 'Too many active aspects (max 20)'),

    /** Custom weights for distribution calculations */
    custom_distribution_weights: customDistributionWeightsSchema,

    /** Zodiac system (Tropical or Sidereal) */
    default_zodiac_system: z.enum(ZODIAC_SYSTEMS, {
      message: 'Invalid zodiac system. Must be Tropical or Sidereal',
    }),

    /** Sidereal mode/ayanamsa (only relevant when using Sidereal zodiac) */
    default_sidereal_mode: z.enum(SIDEREAL_MODES, {
      message: 'Invalid sidereal mode',
    }),

    /** House system code */
    house_system: z.enum(HOUSE_SYSTEM_CODES, {
      message: 'Invalid house system code',
    }),

    /** Perspective type for calculations */
    perspective_type: z.enum(PERSPECTIVE_TYPES, {
      message: 'Invalid perspective type',
    }),

    /** Rulership system */
    rulership_mode: z.enum(['classical', 'modern'], {
      message: 'Invalid rulership mode. Must be classical or modern',
    }),
  })
  .partial()
  .strict()

export type ChartPreferencesUpdateInput = z.infer<typeof chartPreferencesUpdateSchema>

/**
 * Validate chart preferences update data.
 * Returns parsed data or throws an error with validation details.
 */
export function validateChartPreferencesUpdate(data: unknown): ChartPreferencesUpdateInput {
  return chartPreferencesUpdateSchema.parse(data)
}

/**
 * Safely validate chart preferences update data.
 * Returns a result object with either data or error.
 */
export function safeValidateChartPreferencesUpdate(
  data: unknown,
): { success: true; data: ChartPreferencesUpdateInput } | { success: false; error: z.ZodError } {
  const result = chartPreferencesUpdateSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
