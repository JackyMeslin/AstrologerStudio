/**
 * Unit Tests for AstrologerApiClient
 *
 * Tests URL construction, headers, payload structure for all main methods,
 * and error handling (HTTP errors, timeouts, invalid responses).
 *
 * @module src/lib/api/astrologer
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the logger before importing the module under test
vi.mock('@/lib/logging/server', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLevel: vi.fn(() => 'silent'),
  },
}))

// Mock prisma to prevent DB access (defensive, in case future imports add prisma)
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
  default: {},
}))

import type { SubjectModel, ChartRequestOptions, PlanetaryReturnRequestOptions } from '@/types/astrology'

// Test fixtures
const mockSubject: SubjectModel = {
  name: 'Test Subject',
  year: 1990,
  month: 6,
  day: 15,
  hour: 12,
  minute: 30,
  second: 0,
  city: 'London',
  nation: 'GB',
  timezone: 'Europe/London',
  longitude: -0.1278,
  latitude: 51.5074,
}

const mockSecondSubject: SubjectModel = {
  name: 'Second Subject',
  year: 1985,
  month: 3,
  day: 20,
  hour: 8,
  minute: 15,
  second: 0,
  city: 'Paris',
  nation: 'FR',
  timezone: 'Europe/Paris',
  longitude: 2.3522,
  latitude: 48.8566,
}

const mockChartOptions: ChartRequestOptions = {
  theme: 'dark',
  language: 'en',
}

const mockReturnOptions: PlanetaryReturnRequestOptions = {
  year: 2024,
  theme: 'light',
}

const mockChartResponse = {
  status: 'ok',
  chart_svg: '<svg></svg>',
  chart_data: {
    chart_type: 'natal',
    subject: mockSubject,
  },
}

const mockSubjectResponse = {
  status: 'ok',
  subject: {
    ...mockSubject,
    points: [],
    houses: [],
  },
}

const mockContextResponse = {
  status: 'ok',
  context: 'Test context string',
  chart_data: {
    chart_type: 'natal',
  },
}

describe('AstrologerApiClient', () => {
  const originalEnv = process.env
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset environment variables
    vi.resetModules()
    process.env = {
      ...originalEnv,
      ASTROLOGER_API_URL: 'https://test-api.example.com',
      ASTROLOGER_API_HOST: 'test-api.example.com',
      ASTROLOGER_API_HOST_HEADER: 'X-Test-Host',
      ASTROLOGER_API_KEY_HEADER: 'X-Test-Key',
      ASTROLOGER_API_KEY: 'test-api-key',
    }

    // Create mock fetch
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  // Helper to create successful response
  const createSuccessResponse = (data: unknown) => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  })

  // Helper to create error response
  const createErrorResponse = (status: number, errorText: string) => ({
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new Error('Not JSON')),
    text: vi.fn().mockResolvedValue(errorText),
  })

  // Helper to safely extract request body from mock calls
  const getRequestBody = () => {
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit] | undefined
    expect(callArgs).toBeDefined()
    expect(callArgs![1].body).toBeDefined()
    return JSON.parse(callArgs![1].body as string)
  }

  // Helper to dynamically import the client with fresh env
  async function createClient(apiKey?: string) {
    const { AstrologerApiClient } = await import('@/lib/api/astrologer')
    return new AstrologerApiClient(apiKey ?? process.env.ASTROLOGER_API_KEY ?? '')
  }

  describe('constructor', () => {
    it('should initialize with API key', async () => {
      const client = await createClient('my-api-key')
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockSubjectResponse))

      await client.getSubject(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Test-Key': 'my-api-key',
          }),
        }),
      )
    })

    it('should warn but not throw when initialized without API key', async () => {
      const { logger } = await import('@/lib/logging/server')
      const client = await createClient('')

      expect(logger.warn).toHaveBeenCalledWith('AstrologerApiClient initialized without API key!')
      expect(client).toBeDefined()
    })
  })

  describe('URL construction', () => {
    it('should construct correct URL for natal chart', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/chart/birth-chart', expect.any(Object))
    })

    it('should construct correct URL for transit chart', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getTransitChart(mockSubject, mockSecondSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/chart/transit', expect.any(Object))
    })

    it('should construct correct URL for synastry chart', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getSynastryChart(mockSubject, mockSecondSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/chart/synastry', expect.any(Object))
    })

    it('should construct correct URL for composite chart', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getCompositeChart(mockSubject, mockSecondSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/chart/composite', expect.any(Object))
    })

    it('should construct correct URL for now chart', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNowChart()

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/now/chart', expect.any(Object))
    })

    it('should construct correct URL for solar return chart', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getSolarReturnChart(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/chart/solar-return', expect.any(Object))
    })

    it('should construct correct URL for lunar return chart', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getLunarReturnChart(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/chart/lunar-return', expect.any(Object))
    })

    it('should construct correct URL for subject endpoint', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockSubjectResponse))

      await client.getSubject(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/subject', expect.any(Object))
    })

    it('should construct correct URL for transit chart data', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getTransitChartData(mockSubject, mockSecondSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/chart-data/transit', expect.any(Object))
    })
  })

  describe('Context endpoints URL construction', () => {
    it('should construct correct URL for subject context', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getSubjectContext(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/context/subject', expect.any(Object))
    })

    it('should construct correct URL for natal context', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getNatalContext(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/context/birth-chart', expect.any(Object))
    })

    it('should construct correct URL for synastry context', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getSynastryContext(mockSubject, mockSecondSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/context/synastry', expect.any(Object))
    })

    it('should construct correct URL for transit context', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getTransitContext(mockSubject, mockSecondSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/context/transit', expect.any(Object))
    })

    it('should construct correct URL for composite context', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getCompositeContext(mockSubject, mockSecondSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/context/composite', expect.any(Object))
    })

    it('should construct correct URL for solar return context', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({
          ...mockContextResponse,
          return_type: 'solar',
          wheel_type: 'split',
        }),
      )

      await client.getSolarReturnContext(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/context/solar-return', expect.any(Object))
    })

    it('should construct correct URL for lunar return context', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({
          ...mockContextResponse,
          return_type: 'lunar',
          wheel_type: 'split',
        }),
      )

      await client.getLunarReturnContext(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/context/lunar-return', expect.any(Object))
    })
  })

  describe('Headers construction', () => {
    it('should include Content-Type header', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should include custom host header from environment', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Test-Host': 'test-api.example.com',
          }),
        }),
      )
    })

    it('should include custom API key header from environment', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Test-Key': 'test-api-key',
          }),
        }),
      )
    })

    it('should use POST method for chart endpoints', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    it('should include AbortController signal for timeout', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      )
    })
  })

  describe('Payload construction', () => {
    it('should include subject in natal chart payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject, mockChartOptions)

      const body = getRequestBody()

      expect(body.subject).toEqual(mockSubject)
      expect(body.theme).toBe('dark')
      expect(body.language).toBe('en')
    })

    it('should include first_subject and transit_subject in transit chart payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getTransitChart(mockSubject, mockSecondSubject, mockChartOptions)

      const body = getRequestBody()

      expect(body.first_subject).toEqual(mockSubject)
      expect(body.transit_subject).toEqual(mockSecondSubject)
      expect(body.include_house_comparison).toBe(true)
    })

    it('should include first_subject and second_subject in synastry chart payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getSynastryChart(mockSubject, mockSecondSubject, mockChartOptions)

      const body = getRequestBody()

      expect(body.first_subject).toEqual(mockSubject)
      expect(body.second_subject).toEqual(mockSecondSubject)
      expect(body.include_house_comparison).toBe(true)
      expect(body.include_relationship_score).toBe(true)
    })

    it('should include first_subject and second_subject in composite chart payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getCompositeChart(mockSubject, mockSecondSubject, mockChartOptions)

      const body = getRequestBody()

      expect(body.first_subject).toEqual(mockSubject)
      expect(body.second_subject).toEqual(mockSecondSubject)
    })

    it('should include only options in now chart payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNowChart(mockChartOptions)

      const body = getRequestBody()

      expect(body.theme).toBe('dark')
      expect(body.language).toBe('en')
    })

    it('should include subject and options in solar return payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getSolarReturnChart(mockSubject, mockReturnOptions)

      const body = getRequestBody()

      expect(body.subject).toEqual(mockSubject)
      expect(body.year).toBe(2024)
      expect(body.include_house_comparison).toBe(true)
    })

    it('should include subject and options in lunar return payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getLunarReturnChart(mockSubject, mockReturnOptions)

      const body = getRequestBody()

      expect(body.subject).toEqual(mockSubject)
      expect(body.year).toBe(2024)
      expect(body.include_house_comparison).toBe(true)
    })

    it('should include subject in getSubject payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockSubjectResponse))

      await client.getSubject(mockSubject, { active_points: ['Sun', 'Moon'] })

      const body = getRequestBody()

      expect(body.subject).toEqual(mockSubject)
      expect(body.active_points).toEqual(['Sun', 'Moon'])
    })

    it('should include subjects in transit chart data payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getTransitChartData(mockSubject, mockSecondSubject, {
        active_points: ['Sun', 'Moon'],
      })

      const body = getRequestBody()

      expect(body.first_subject).toEqual(mockSubject)
      expect(body.transit_subject).toEqual(mockSecondSubject)
      expect(body.include_house_comparison).toBe(true)
      expect(body.active_points).toEqual(['Sun', 'Moon'])
    })
  })

  describe('Context endpoints payload construction', () => {
    it('should include subject in subject context payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getSubjectContext(mockSubject)

      const body = getRequestBody()

      expect(body.subject).toEqual(mockSubject)
    })

    it('should include subject and options in natal context payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getNatalContext(mockSubject, { active_points: ['Sun', 'Moon'] })

      const body = getRequestBody()

      expect(body.subject).toEqual(mockSubject)
      expect(body.active_points).toEqual(['Sun', 'Moon'])
    })

    it('should include subjects in synastry context payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getSynastryContext(mockSubject, mockSecondSubject)

      const body = getRequestBody()

      expect(body.first_subject).toEqual(mockSubject)
      expect(body.second_subject).toEqual(mockSecondSubject)
      expect(body.include_house_comparison).toBe(true)
      expect(body.include_relationship_score).toBe(true)
    })

    it('should include subjects in transit context payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getTransitContext(mockSubject, mockSecondSubject)

      const body = getRequestBody()

      expect(body.first_subject).toEqual(mockSubject)
      expect(body.transit_subject).toEqual(mockSecondSubject)
      expect(body.include_house_comparison).toBe(true)
    })

    it('should include subjects in composite context payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      await client.getCompositeContext(mockSubject, mockSecondSubject)

      const body = getRequestBody()

      expect(body.first_subject).toEqual(mockSubject)
      expect(body.second_subject).toEqual(mockSecondSubject)
    })

    it('should include subject in solar return context payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({
          ...mockContextResponse,
          return_type: 'solar',
          wheel_type: 'split',
        }),
      )

      await client.getSolarReturnContext(mockSubject, { year: 2025 })

      const body = getRequestBody()

      expect(body.subject).toEqual(mockSubject)
      expect(body.year).toBe(2025)
    })

    it('should include subject in lunar return context payload', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(
        createSuccessResponse({
          ...mockContextResponse,
          return_type: 'lunar',
          wheel_type: 'split',
        }),
      )

      await client.getLunarReturnContext(mockSubject, { year: 2025 })

      const body = getRequestBody()

      expect(body.subject).toEqual(mockSubject)
      expect(body.year).toBe(2025)
    })
  })

  describe('Error handling', () => {
    it('should throw error with status code for HTTP errors', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createErrorResponse(404, 'Not Found'))

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow('API Error 404: Not Found')
    })

    it('should throw error with status code for 500 errors', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createErrorResponse(500, 'Internal Server Error'))

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow('API Error 500: Internal Server Error')
    })

    it('should throw error with status code for 401 unauthorized', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createErrorResponse(401, 'Unauthorized'))

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow('API Error 401: Unauthorized')
    })

    it('should throw error with status code for 429 rate limit', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createErrorResponse(429, 'Too Many Requests'))

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow('API Error 429: Too Many Requests')
    })

    it('should log error for HTTP errors', async () => {
      const { logger } = await import('@/lib/logging/server')
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createErrorResponse(404, 'Not Found'))

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith('[AstrologerAPI] API Error 404: Not Found')
    })

    it('should throw timeout error on AbortError', async () => {
      const client = await createClient()
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow('Request timeout after 15000ms')
    })

    it('should log timeout error', async () => {
      const { logger } = await import('@/lib/logging/server')
      const client = await createClient()
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith('[AstrologerAPI] Request timeout after 15000ms')
    })

    it('should throw original error for network failures', async () => {
      const client = await createClient()
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow('Network failure')
    })

    it('should log network error with context', async () => {
      const { logger } = await import('@/lib/logging/server')
      const client = await createClient()
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith('[AstrologerAPI] Request failed: Network failure', {
        endpoint: '/chart/birth-chart',
        method: 'POST',
      })
    })

    it('should throw "Unknown error" for non-Error exceptions', async () => {
      const client = await createClient()
      mockFetch.mockRejectedValueOnce('string error')

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow('Unknown error occurred during API request')
    })

    it('should log unknown error', async () => {
      const { logger } = await import('@/lib/logging/server')
      const client = await createClient()
      mockFetch.mockRejectedValueOnce('string error')

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith('[AstrologerAPI] Unknown error occurred during API request')
    })

    it('should throw error for invalid JSON response', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
        text: vi.fn().mockResolvedValue('invalid json'),
      })

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow('Unexpected token')
    })
  })

  describe('Response handling', () => {
    it('should return parsed JSON response on success', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      const result = await client.getNatalChart(mockSubject)

      expect(result).toEqual(mockChartResponse)
    })

    it('should return subject data from getSubject', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockSubjectResponse))

      const result = await client.getSubject(mockSubject)

      expect(result.status).toBe('ok')
      expect(result.subject).toBeDefined()
    })

    it('should return context data from getNatalContext', async () => {
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockContextResponse))

      const result = await client.getNatalContext(mockSubject)

      expect(result.status).toBe('ok')
      expect(result.context).toBe('Test context string')
    })
  })

  describe('Debug logging', () => {
    it('should log request URL and method', async () => {
      const { logger } = await import('@/lib/logging/server')
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject)

      expect(logger.debug).toHaveBeenCalledWith('[AstrologerAPI] POST https://test-api.example.com/chart/birth-chart')
    })

    it('should log request body', async () => {
      const { logger } = await import('@/lib/logging/server')
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject)

      expect(logger.debug).toHaveBeenCalledWith(
        '[AstrologerAPI] Request body:',
        expect.stringContaining('"name": "Test Subject"'),
      )
    })

    it('should log response status on success', async () => {
      const { logger } = await import('@/lib/logging/server')
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createSuccessResponse(mockChartResponse))

      await client.getNatalChart(mockSubject)

      expect(logger.debug).toHaveBeenCalledWith('[AstrologerAPI] Response status: OK, chart_type: natal')
    })

    it('should log error response body', async () => {
      const { logger } = await import('@/lib/logging/server')
      const client = await createClient()
      mockFetch.mockResolvedValueOnce(createErrorResponse(400, 'Bad Request: missing field'))

      await expect(client.getNatalChart(mockSubject)).rejects.toThrow()

      expect(logger.debug).toHaveBeenCalledWith('[AstrologerAPI] Error response: Bad Request: missing field')
    })
  })
})
