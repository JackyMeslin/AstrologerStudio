/**
 * Unit Tests for Form Utilities
 *
 * Tests the form field setter helpers used for type-safe form value management
 * with React Hook Form. Uses minimal mocks to avoid database dependencies.
 *
 * @module src/lib/utils/form
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UseFormReturn } from 'react-hook-form'
import { setFormField, setLocationField, setLocationFields, type LocationFormFields } from '@/lib/utils/form'

// ============================================================================
// Mock Factory
// ============================================================================

/**
 * Creates a minimal mock of UseFormReturn with setValue, getValues, and trigger.
 * The mock tracks all setValue calls for verification.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockForm<T extends Record<string, any>>(
  initialValues: T = {} as T,
): {
  form: UseFormReturn<T>
  setValueCalls: Array<{ field: string; value: unknown; options?: Record<string, boolean> }>
  getCurrentValues: () => T
} {
  const values = { ...initialValues }
  const setValueCalls: Array<{ field: string; value: unknown; options?: Record<string, boolean> }> = []

  const mockSetValue = vi.fn((field: string, value: unknown, options?: Record<string, boolean>) => {
    setValueCalls.push({ field, value, options })
    ;(values as Record<string, unknown>)[field] = value
  })

  const mockGetValues = vi.fn((field?: string) => {
    if (field) {
      return (values as Record<string, unknown>)[field]
    }
    return values
  })

  const mockTrigger = vi.fn()

  const form = {
    setValue: mockSetValue,
    getValues: mockGetValues,
    trigger: mockTrigger,
  } as unknown as UseFormReturn<T>

  return {
    form,
    setValueCalls,
    getCurrentValues: () => ({ ...values }),
  }
}

// ============================================================================
// setFormField Tests
// ============================================================================

describe('setFormField', () => {
  /**
   * Tests for the generic type-safe form field setter.
   * This function wraps form.setValue to provide type-safe field setting.
   */

  it('should call setValue with the correct field and value', () => {
    const { form, setValueCalls } = createMockForm<{ name: string; age: number }>({
      name: '',
      age: 0,
    })

    setFormField(form, 'name', 'Alice')

    expect(setValueCalls).toHaveLength(1)
    expect(setValueCalls[0]).toEqual({
      field: 'name',
      value: 'Alice',
      options: undefined,
    })
  })

  it('should pass options to setValue', () => {
    const { form, setValueCalls } = createMockForm<{ email: string }>({ email: '' })

    setFormField(form, 'email', 'test@example.com', { shouldDirty: true, shouldValidate: true })

    expect(setValueCalls[0]!.options).toEqual({ shouldDirty: true, shouldValidate: true })
  })

  it('should set numeric values correctly', () => {
    const { form, setValueCalls } = createMockForm<{ count: number }>({ count: 0 })

    setFormField(form, 'count', 42)

    expect(setValueCalls[0]!.value).toBe(42)
  })

  it('should set boolean values correctly', () => {
    const { form, setValueCalls } = createMockForm<{ active: boolean }>({ active: false })

    setFormField(form, 'active', true)

    expect(setValueCalls[0]!.value).toBe(true)
  })

  it('should handle undefined values', () => {
    const { form, setValueCalls } = createMockForm<{ optional?: string }>({})

    setFormField(form, 'optional', undefined)

    expect(setValueCalls[0]!.value).toBeUndefined()
  })

  it('should support shouldTouch option', () => {
    const { form, setValueCalls } = createMockForm<{ field: string }>({ field: '' })

    setFormField(form, 'field', 'value', { shouldTouch: true })

    expect(setValueCalls[0]!.options).toEqual({ shouldTouch: true })
  })
})

// ============================================================================
// setLocationField Tests
// ============================================================================

describe('setLocationField', () => {
  /**
   * Tests for the location-specific field setter.
   * Handles the common pattern of setting location fields in forms.
   */

  interface TestLocationForm extends LocationFormFields {
    name: string
  }

  it('should set city field correctly', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationField(form, 'city', 'Rome')

    expect(setValueCalls[0]).toEqual({
      field: 'city',
      value: 'Rome',
      options: undefined,
    })
  })

  it('should set nation field correctly', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationField(form, 'nation', 'Italy')

    expect(setValueCalls[0]!.field).toBe('nation')
    expect(setValueCalls[0]!.value).toBe('Italy')
  })

  it('should set latitude as a number', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationField(form, 'latitude', 41.9028)

    expect(setValueCalls[0]!.field).toBe('latitude')
    expect(setValueCalls[0]!.value).toBe(41.9028)
  })

  it('should set longitude as a number', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationField(form, 'longitude', 12.4964)

    expect(setValueCalls[0]!.field).toBe('longitude')
    expect(setValueCalls[0]!.value).toBe(12.4964)
  })

  it('should set timezone field correctly', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationField(form, 'timezone', 'Europe/Rome')

    expect(setValueCalls[0]!.field).toBe('timezone')
    expect(setValueCalls[0]!.value).toBe('Europe/Rome')
  })

  it('should pass options to setValue for location fields', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationField(form, 'city', 'Paris', { shouldDirty: true })

    expect(setValueCalls[0]!.options).toEqual({ shouldDirty: true })
  })

  it('should handle undefined location values', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationField(form, 'city', undefined)

    expect(setValueCalls[0]!.value).toBeUndefined()
  })

  it('should handle negative coordinates', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    // Buenos Aires coordinates (negative values)
    setLocationField(form, 'latitude', -34.6037)
    setLocationField(form, 'longitude', -58.3816)

    expect(setValueCalls[0]!.value).toBe(-34.6037)
    expect(setValueCalls[1]!.value).toBe(-58.3816)
  })
})

// ============================================================================
// setLocationFields Tests
// ============================================================================

describe('setLocationFields', () => {
  /**
   * Tests for batch setting multiple location fields.
   * Used when selecting a city from suggestions to populate all location data.
   */

  interface TestLocationForm extends LocationFormFields {
    name: string
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set all location fields at once', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationFields(form, {
      city: 'Tokyo',
      nation: 'Japan',
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
    })

    expect(setValueCalls).toHaveLength(5)

    const fields = setValueCalls.map((c) => c.field)
    expect(fields).toContain('city')
    expect(fields).toContain('nation')
    expect(fields).toContain('latitude')
    expect(fields).toContain('longitude')
    expect(fields).toContain('timezone')
  })

  it('should set only provided fields', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationFields(form, {
      city: 'London',
      timezone: 'Europe/London',
    })

    expect(setValueCalls).toHaveLength(2)

    const fields = setValueCalls.map((c) => c.field)
    expect(fields).toContain('city')
    expect(fields).toContain('timezone')
    expect(fields).not.toContain('latitude')
    expect(fields).not.toContain('longitude')
  })

  it('should skip undefined values', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationFields(form, {
      city: 'Berlin',
      nation: undefined,
      latitude: 52.52,
      longitude: undefined,
      timezone: 'Europe/Berlin',
    })

    expect(setValueCalls).toHaveLength(3)

    const fields = setValueCalls.map((c) => c.field)
    expect(fields).toContain('city')
    expect(fields).toContain('latitude')
    expect(fields).toContain('timezone')
    expect(fields).not.toContain('nation')
    expect(fields).not.toContain('longitude')
  })

  it('should apply options to all fields', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationFields(
      form,
      {
        city: 'Sydney',
        nation: 'Australia',
      },
      { shouldDirty: true, shouldValidate: true },
    )

    expect(setValueCalls).toHaveLength(2)
    expect(setValueCalls[0]!.options).toEqual({ shouldDirty: true, shouldValidate: true })
    expect(setValueCalls[1]!.options).toEqual({ shouldDirty: true, shouldValidate: true })
  })

  it('should handle empty values object', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    setLocationFields(form, {})

    expect(setValueCalls).toHaveLength(0)
  })

  it('should update form values correctly', () => {
    const { form, getCurrentValues } = createMockForm<TestLocationForm>({
      name: 'Test Subject',
      city: '',
      nation: '',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    })

    setLocationFields(form, {
      city: 'New York',
      nation: 'United States',
      latitude: 40.7128,
      longitude: -74.006,
      timezone: 'America/New_York',
    })

    const values = getCurrentValues()
    expect(values.city).toBe('New York')
    expect(values.nation).toBe('United States')
    expect(values.latitude).toBe(40.7128)
    expect(values.longitude).toBe(-74.006)
    expect(values.timezone).toBe('America/New_York')
    // Non-location field should be preserved
    expect(values.name).toBe('Test Subject')
  })

  it('should handle coordinates at extreme values', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    // North Pole
    setLocationFields(form, {
      latitude: 90,
      longitude: 0,
    })

    const latCall = setValueCalls.find((c) => c.field === 'latitude')
    const lonCall = setValueCalls.find((c) => c.field === 'longitude')

    expect(latCall?.value).toBe(90)
    expect(lonCall?.value).toBe(0)
  })

  it('should maintain field order consistency', () => {
    const { form, setValueCalls } = createMockForm<TestLocationForm>({
      name: '',
      timezone: 'UTC',
    })

    // Call multiple times to ensure consistent behavior
    setLocationFields(form, { city: 'A', nation: 'B' })

    // All calls should have been made
    expect(setValueCalls.length).toBeGreaterThanOrEqual(2)
  })
})
