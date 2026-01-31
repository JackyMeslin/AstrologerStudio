/**
 * Unit Tests for Preferences Actions
 *
 * Tests the preferences server actions including getChartPreferences and updateChartPreferences.
 *
 * @module src/actions/preferences
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock session
const mockGetSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  getSession: () => mockGetSession(),
}))

// Mock prisma chartPreferences operations
const mockPrismaChartPreferences = {
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
}

// Mock prisma user operations
const mockPrismaUser = {
  findUnique: vi.fn(),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    chartPreferences: {
      get findUnique() {
        return mockPrismaChartPreferences.findUnique
      },
      get create() {
        return mockPrismaChartPreferences.create
      },
      get update() {
        return mockPrismaChartPreferences.update
      },
      get upsert() {
        return mockPrismaChartPreferences.upsert
      },
    },
    user: {
      get findUnique() {
        return mockPrismaUser.findUnique
      },
    },
  },
}))

// Mock next/cache
const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}))

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}
vi.mock('@/lib/logging/server', () => ({
  logger: mockLogger,
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

const mockSession = { userId: 'user-123', username: 'testuser' }

/**
 * Full Prisma chart preferences record
 */
const basePrismaPreferences = {
  id: 'pref-123',
  userId: 'user-123',
  theme: 'classic',
  date_format: 'EU',
  time_format: '24h',
  show_aspect_icons: true,
  show_degree_indicators: true,
  distribution_method: 'weighted',
  active_points: JSON.stringify([
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
  ]),
  active_aspects: JSON.stringify([
    { name: 'conjunction', orb: 10 },
    { name: 'opposition', orb: 10 },
    { name: 'trine', orb: 8 },
    { name: 'square', orb: 5 },
    { name: 'sextile', orb: 6 },
  ]),
  custom_distribution_weights: JSON.stringify({ sun: 2, moon: 2 }),
  default_zodiac_system: 'Tropical',
  default_sidereal_mode: 'LAHIRI',
  house_system: 'P',
  perspective_type: 'Apparent Geocentric',
  rulership_mode: 'classical',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

// ============================================================================
// TESTS
// ============================================================================

describe('Preferences Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(mockSession)
  })

  // ==========================================================================
  // getChartPreferences TESTS
  // ==========================================================================

  describe('getChartPreferences', () => {
    it('should return null when session is null', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockGetSession.mockResolvedValue(null)

      const result = await getChartPreferences()

      expect(result).toBeNull()
      expect(mockPrismaChartPreferences.findUnique).not.toHaveBeenCalled()
    })

    it('should return null when session has no userId', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockGetSession.mockResolvedValue({ username: 'testuser' })

      const result = await getChartPreferences()

      expect(result).toBeNull()
    })

    it('should return existing preferences when found', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue(basePrismaPreferences)

      const result = await getChartPreferences()

      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        theme: 'classic',
        date_format: 'EU',
        time_format: '24h',
        show_aspect_icons: true,
        show_degree_indicators: true,
        distribution_method: 'weighted',
        default_zodiac_system: 'Tropical',
        default_sidereal_mode: 'LAHIRI',
        house_system: 'P',
        perspective_type: 'Apparent Geocentric',
        rulership_mode: 'classical',
      })
      expect(mockPrismaChartPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId: mockSession.userId },
      })
    })

    it('should parse JSON fields correctly (active_points, active_aspects)', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue(basePrismaPreferences)

      const result = await getChartPreferences()

      expect(result?.active_points).toEqual([
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
      ])
      expect(result?.active_aspects).toEqual([
        { name: 'conjunction', orb: 10 },
        { name: 'opposition', orb: 10 },
        { name: 'trine', orb: 8 },
        { name: 'square', orb: 5 },
        { name: 'sextile', orb: 6 },
      ])
      expect(result?.custom_distribution_weights).toEqual({ sun: 2, moon: 2 })
    })

    it('should create default preferences if none exist', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue(null)
      mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
      mockPrismaChartPreferences.create.mockResolvedValue(basePrismaPreferences)

      const result = await getChartPreferences()

      expect(mockPrismaChartPreferences.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockSession.userId,
          theme: 'classic',
          show_aspect_icons: true,
          distribution_method: 'weighted',
          default_zodiac_system: 'Tropical',
          default_sidereal_mode: 'LAHIRI',
          house_system: 'P',
          perspective_type: 'Apparent Geocentric',
          rulership_mode: 'classical',
        }),
      })
      expect(result).not.toBeNull()
    })

    it('should return null if user does not exist when creating defaults', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue(null)
      mockPrismaUser.findUnique.mockResolvedValue(null)

      const result = await getChartPreferences()

      expect(result).toBeNull()
      expect(mockPrismaChartPreferences.create).not.toHaveBeenCalled()
    })

    it('should map legacy house system "Placidus" to "P"', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue({
        ...basePrismaPreferences,
        house_system: 'Placidus',
      })

      const result = await getChartPreferences()

      expect(result?.house_system).toBe('P')
    })

    it('should map legacy house system "Koch" to "K"', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue({
        ...basePrismaPreferences,
        house_system: 'Koch',
      })

      const result = await getChartPreferences()

      expect(result?.house_system).toBe('K')
    })

    it('should map legacy house system "Whole_Sign" to "W"', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue({
        ...basePrismaPreferences,
        house_system: 'Whole_Sign',
      })

      const result = await getChartPreferences()

      expect(result?.house_system).toBe('W')
    })

    it('should map legacy house system "Equal" to "A"', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue({
        ...basePrismaPreferences,
        house_system: 'Equal',
      })

      const result = await getChartPreferences()

      expect(result?.house_system).toBe('A')
    })

    it('should map other legacy house systems correctly', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')

      const legacyMappings = [
        { legacy: 'Regiomontanus', code: 'R' },
        { legacy: 'Campanus', code: 'C' },
        { legacy: 'Porphyry', code: 'O' },
        { legacy: 'Morinus', code: 'M' },
        { legacy: 'Topocentric', code: 'T' },
        { legacy: 'Alcabitius', code: 'B' },
      ]

      for (const { legacy, code } of legacyMappings) {
        vi.clearAllMocks()
        mockGetSession.mockResolvedValue(mockSession)
        mockPrismaChartPreferences.findUnique.mockResolvedValue({
          ...basePrismaPreferences,
          house_system: legacy,
        })

        const result = await getChartPreferences()

        expect(result?.house_system).toBe(code)
      }
    })

    it('should pass through already-coded house system values', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue({
        ...basePrismaPreferences,
        house_system: 'K',
      })

      const result = await getChartPreferences()

      expect(result?.house_system).toBe('K')
    })

    it('should map legacy perspective "Geocentric" to "Apparent Geocentric"', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue({
        ...basePrismaPreferences,
        perspective_type: 'Geocentric',
      })

      const result = await getChartPreferences()

      expect(result?.perspective_type).toBe('Apparent Geocentric')
    })

    it('should pass through non-legacy perspective values', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockResolvedValue({
        ...basePrismaPreferences,
        perspective_type: 'True Geocentric',
      })

      const result = await getChartPreferences()

      expect(result?.perspective_type).toBe('True Geocentric')
    })

    it('should update preferences if critical fields are missing', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      const incompletePrefs = {
        ...basePrismaPreferences,
        active_points: null,
        active_aspects: null,
        house_system: null,
        perspective_type: null,
        default_zodiac_system: null,
      }
      mockPrismaChartPreferences.findUnique.mockResolvedValue(incompletePrefs)
      mockPrismaChartPreferences.update.mockResolvedValue(basePrismaPreferences)

      await getChartPreferences()

      expect(mockPrismaChartPreferences.update).toHaveBeenCalledWith({
        where: { userId: mockSession.userId },
        data: expect.objectContaining({
          house_system: 'P',
          perspective_type: 'Apparent Geocentric',
          default_zodiac_system: 'Tropical',
        }),
      })
    })

    it('should return empty arrays for null JSON fields', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      const prefsWithNullJson = {
        ...basePrismaPreferences,
        active_points: null,
        active_aspects: null,
        custom_distribution_weights: null,
      }
      // Return a complete prefs after the update step
      mockPrismaChartPreferences.findUnique.mockResolvedValue(prefsWithNullJson)
      mockPrismaChartPreferences.update.mockResolvedValue({
        ...basePrismaPreferences,
        active_points: JSON.stringify(['Sun', 'Moon']),
        active_aspects: JSON.stringify([{ name: 'conjunction', orb: 10 }]),
        custom_distribution_weights: null,
      })

      const result = await getChartPreferences()

      // After update the mocked values are returned
      expect(result?.active_points).toEqual(['Sun', 'Moon'])
      expect(result?.active_aspects).toEqual([{ name: 'conjunction', orb: 10 }])
    })

    it('should return null on error', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.findUnique.mockRejectedValue(new Error('Database error'))

      const result = await getChartPreferences()

      expect(result).toBeNull()
    })

    it('should return null when database returns null house_system after update (mapLegacyHouseSystem throws)', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      // Trigger the needsUpdate branch by having a null field
      const incompletePrefs = {
        ...basePrismaPreferences,
        active_points: null,
      }
      mockPrismaChartPreferences.findUnique.mockResolvedValue(incompletePrefs)
      // Mock update to return preferences with null house_system (database inconsistency)
      mockPrismaChartPreferences.update.mockResolvedValue({
        ...basePrismaPreferences,
        house_system: null,
      })

      const result = await getChartPreferences()

      // Should catch the error and return null
      expect(result).toBeNull()
    })

    it('should log configuration error when house_system is null (but not expose in user-facing error)', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      const incompletePrefs = {
        ...basePrismaPreferences,
        active_points: null,
      }
      mockPrismaChartPreferences.findUnique.mockResolvedValue(incompletePrefs)
      mockPrismaChartPreferences.update.mockResolvedValue({
        ...basePrismaPreferences,
        house_system: null,
      })

      await getChartPreferences()

      // Verify technical details are logged for debugging
      expect(mockLogger.error).toHaveBeenCalledWith('Missing required preference: house_system is null or empty', {
        field: 'house_system',
      })
    })

    it('should return null when database returns null perspective_type after update (mapLegacyPerspective throws)', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      // Trigger the needsUpdate branch by having a null field
      const incompletePrefs = {
        ...basePrismaPreferences,
        active_aspects: null,
      }
      mockPrismaChartPreferences.findUnique.mockResolvedValue(incompletePrefs)
      // Mock update to return preferences with null perspective_type (database inconsistency)
      mockPrismaChartPreferences.update.mockResolvedValue({
        ...basePrismaPreferences,
        perspective_type: null,
      })

      const result = await getChartPreferences()

      // Should catch the error and return null
      expect(result).toBeNull()
    })

    it('should log configuration error when perspective_type is null (but not expose in user-facing error)', async () => {
      const { getChartPreferences } = await import('@/actions/preferences')
      const incompletePrefs = {
        ...basePrismaPreferences,
        active_aspects: null,
      }
      mockPrismaChartPreferences.findUnique.mockResolvedValue(incompletePrefs)
      mockPrismaChartPreferences.update.mockResolvedValue({
        ...basePrismaPreferences,
        perspective_type: null,
      })

      await getChartPreferences()

      // Verify technical details are logged for debugging
      expect(mockLogger.error).toHaveBeenCalledWith('Missing required preference: perspective_type is null or empty', {
        field: 'perspective_type',
      })
    })
  })

  // ==========================================================================
  // updateChartPreferences TESTS
  // ==========================================================================

  describe('updateChartPreferences', () => {
    beforeEach(() => {
      mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
      mockPrismaChartPreferences.upsert.mockResolvedValue(basePrismaPreferences)
    })

    it('should throw error when session is null', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')
      mockGetSession.mockResolvedValue(null)

      await expect(updateChartPreferences({ theme: 'dark' })).rejects.toThrow('Unauthorized')
      expect(mockPrismaChartPreferences.upsert).not.toHaveBeenCalled()
    })

    it('should verify user exists before updating', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')

      await updateChartPreferences({ theme: 'dark' })

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { id: mockSession.userId },
        select: { id: true },
      })
    })

    it('should throw generic error when user not found (hiding implementation details)', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')
      mockPrismaUser.findUnique.mockResolvedValue(null)

      await expect(updateChartPreferences({ theme: 'dark' })).rejects.toThrow(
        'Impossibile salvare le preferenze. Riprova più tardi.',
      )
      expect(mockPrismaChartPreferences.upsert).not.toHaveBeenCalled()
      // Verify technical details are logged
      expect(mockLogger.warn).toHaveBeenCalledWith('Preferences update attempted for non-existent user', {
        userId: mockSession.userId,
      })
    })

    it('should update specified fields using upsert', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')

      await updateChartPreferences({ theme: 'dark', show_aspect_icons: false })

      expect(mockPrismaChartPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: mockSession.userId },
        create: expect.objectContaining({
          userId: mockSession.userId,
          theme: 'dark',
          show_aspect_icons: false,
        }),
        update: expect.objectContaining({
          theme: 'dark',
          show_aspect_icons: false,
        }),
      })
    })

    it('should serialize active_points as JSON', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')
      const activePoints = ['Sun', 'Moon', 'Mercury']

      await updateChartPreferences({ active_points: activePoints })

      expect(mockPrismaChartPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            active_points: JSON.stringify(activePoints),
          }),
          update: expect.objectContaining({
            active_points: JSON.stringify(activePoints),
          }),
        }),
      )
    })

    it('should serialize active_aspects as JSON', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')
      const activeAspects = [
        { name: 'conjunction', orb: 8 },
        { name: 'trine', orb: 6 },
      ]

      await updateChartPreferences({ active_aspects: activeAspects })

      expect(mockPrismaChartPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            active_aspects: JSON.stringify(activeAspects),
          }),
          update: expect.objectContaining({
            active_aspects: JSON.stringify(activeAspects),
          }),
        }),
      )
    })

    it('should serialize custom_distribution_weights as JSON', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')
      const weights = { sun: 3, moon: 3, mercury: 1.5 }

      await updateChartPreferences({ custom_distribution_weights: weights })

      expect(mockPrismaChartPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            custom_distribution_weights: JSON.stringify(weights),
          }),
          update: expect.objectContaining({
            custom_distribution_weights: JSON.stringify(weights),
          }),
        }),
      )
    })

    it('should not include JSON fields when not provided', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')

      await updateChartPreferences({ theme: 'light' })

      const upsertCall = mockPrismaChartPreferences.upsert.mock.calls[0]![0]
      expect(upsertCall.create.active_points).toBeUndefined()
      expect(upsertCall.create.active_aspects).toBeUndefined()
      expect(upsertCall.create.custom_distribution_weights).toBeUndefined()
    })

    it('should revalidate chart-related paths after update', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')

      await updateChartPreferences({ theme: 'dark' })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/settings')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/now-chart')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/subjects/[id]/natal')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/subjects/[id]/transits')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/subjects/[id]/synastry')
    })

    it('should update multiple fields at once', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')

      await updateChartPreferences({
        theme: 'dark',
        date_format: 'US',
        time_format: '12h',
        house_system: 'K',
        perspective_type: 'True Geocentric',
        rulership_mode: 'modern',
      })

      expect(mockPrismaChartPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            theme: 'dark',
            date_format: 'US',
            time_format: '12h',
            house_system: 'K',
            perspective_type: 'True Geocentric',
            rulership_mode: 'modern',
          }),
        }),
      )
    })

    it('should throw generic error when upsert fails (hiding implementation details)', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')
      mockPrismaChartPreferences.upsert.mockRejectedValue(new Error('Database constraint error'))

      await expect(updateChartPreferences({ theme: 'dark' })).rejects.toThrow(
        'Impossibile salvare le preferenze. Riprova più tardi.',
      )
    })

    it('should re-throw Unauthorized errors directly', async () => {
      const { updateChartPreferences } = await import('@/actions/preferences')
      mockGetSession.mockResolvedValue(null)

      await expect(updateChartPreferences({ theme: 'dark' })).rejects.toThrow('Unauthorized')
    })

    // ========================================================================
    // INPUT VALIDATION TESTS
    // ========================================================================

    describe('input validation', () => {
      it('should reject invalid date_format values with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ date_format: 'INVALID' as 'US' | 'EU' | 'ISO' })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
        // Verify validation details are logged
        expect(mockLogger.warn).toHaveBeenCalledWith('Preferences validation failed', expect.any(Object))
      })

      it('should reject invalid time_format values with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ time_format: '16h' as '12h' | '24h' })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should reject invalid house_system codes with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ house_system: 'Placidus' })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should reject invalid celestial point names with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ active_points: ['Sun', 'InvalidPlanet', 'Moon'] })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should reject active_aspects with invalid aspect names with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ active_aspects: [{ name: 'invalid_aspect', orb: 5 }] })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should reject active_aspects with negative orbs with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ active_aspects: [{ name: 'conjunction', orb: -1 }] })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should reject active_aspects with orbs over 30 degrees with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ active_aspects: [{ name: 'conjunction', orb: 31 }] })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should reject custom_distribution_weights with negative values with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ custom_distribution_weights: { sun: -1 } })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should reject invalid zodiac_system values with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ default_zodiac_system: 'Invalid' })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should reject unknown extra fields with generic error', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        const dataWithExtraFields = {
          theme: 'dark',
          unknownField: 'malicious_value',
        } as { theme: string }

        await expect(updateChartPreferences(dataWithExtraFields)).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should accept valid complete preferences update', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(
          updateChartPreferences({
            theme: 'dark',
            date_format: 'EU',
            time_format: '24h',
            show_aspect_icons: true,
            house_system: 'K',
            perspective_type: 'Apparent Geocentric',
            rulership_mode: 'modern',
          }),
        ).resolves.toBeUndefined()
      })

      it('should throw generic error for validation failures (not expose validation details)', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ house_system: 'INVALID' })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
        // Ensure validation details are NOT exposed in error message
        try {
          await updateChartPreferences({ house_system: 'INVALID' })
        } catch (e) {
          expect((e as Error).message).not.toContain('Validation failed')
          expect((e as Error).message).not.toContain('house_system')
        }
      })
    })

    // ========================================================================
    // ERROR MESSAGE SECURITY TESTS
    // ========================================================================

    describe('error message security', () => {
      it('should not expose database constraint details in error messages', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')
        mockPrismaChartPreferences.upsert.mockRejectedValue(new Error('Unique constraint violation on field: userId'))

        await expect(updateChartPreferences({ theme: 'dark' })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
        // Ensure the specific error does NOT leak to the user
        try {
          await updateChartPreferences({ theme: 'dark' })
        } catch (e) {
          expect((e as Error).message).not.toContain('constraint')
          expect((e as Error).message).not.toContain('userId')
        }
      })

      it('should log technical error details when update fails', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')
        const technicalError = new Error('Database connection timeout')
        mockPrismaChartPreferences.upsert.mockRejectedValue(technicalError)

        await expect(updateChartPreferences({ theme: 'dark' })).rejects.toThrow()

        // Verify technical details are logged
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to update chart preferences', technicalError)
      })

      it('should not expose internal structure in error when upsert fails with FK violation', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')
        mockPrismaChartPreferences.upsert.mockRejectedValue(
          new Error('Foreign key constraint failed on the field: chartPreferencesUserId'),
        )

        await expect(updateChartPreferences({ theme: 'dark' })).rejects.toThrow(
          'Impossibile salvare le preferenze. Riprova più tardi.',
        )
      })

      it('should not expose user existence in error messages', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')
        mockPrismaUser.findUnique.mockResolvedValue(null)

        try {
          await updateChartPreferences({ theme: 'dark' })
        } catch (e) {
          expect((e as Error).message).not.toContain('User not found')
          expect((e as Error).message).not.toContain('not found')
          expect((e as Error).message).toBe('Impossibile salvare le preferenze. Riprova più tardi.')
        }
      })

      it('should not expose validation field names in error messages', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        try {
          await updateChartPreferences({ house_system: 'INVALID' })
        } catch (e) {
          expect((e as Error).message).not.toContain('house_system')
          expect((e as Error).message).not.toContain('Validation failed')
          expect((e as Error).message).toBe('Impossibile salvare le preferenze. Riprova più tardi.')
        }
      })

      it('should log validation errors for debugging', async () => {
        const { updateChartPreferences } = await import('@/actions/preferences')

        await expect(updateChartPreferences({ house_system: 'INVALID' })).rejects.toThrow()

        // Verify validation details are logged
        expect(mockLogger.warn).toHaveBeenCalledWith('Preferences validation failed', {
          errors: expect.stringContaining('house_system'),
        })
      })
    })
  })
})
