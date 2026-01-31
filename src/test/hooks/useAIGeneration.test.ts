import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAIGeneration } from '@/hooks/useAIGeneration'

// Mock the AI interpretation settings store
const mockGetActivePrompt = vi.fn().mockReturnValue('test-system-prompt')

vi.mock('@/stores/aiInterpretationSettings', () => ({
  useAIInterpretation: () => ({
    language: 'en',
    getActivePrompt: mockGetActivePrompt,
    include_house_comparison: true,
  }),
}))

vi.mock('@/lib/ai/prompts', () => ({
  CHART_TYPE_PROMPTS: {
    natal: 'natal-prompt',
    synastry: 'synastry-prompt',
    transit: 'transit-prompt',
    composite: 'composite-prompt',
  },
}))

// Helper to create a ReadableStream from text chunks
function createReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]))
        index++
      } else {
        controller.close()
      }
    },
  })
}

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAIGeneration', () => {
  it('returns a generateInterpretation function', () => {
    const { result } = renderHook(() => useAIGeneration())
    expect(result.current.generateInterpretation).toBeInstanceOf(Function)
  })

  it('sends correct request body for a natal chart', async () => {
    const body = createReadableStream(['Hello ', 'world'])
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body,
    })

    const { result } = renderHook(() => useAIGeneration())

    await act(async () => {
      await result.current.generateInterpretation({
        chartData: { subject: { name: 'Test' } },
        chartType: 'natal',
      })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/interpret',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody).toEqual({
      chartData: { subject: { name: 'Test' } },
      chartType: 'natal',
      systemPrompt: 'test-system-prompt',
      chartTypePrompt: 'natal-prompt',
      language: 'en',
      include_house_comparison: true,
    })
  })

  it('includes relationshipType when provided', async () => {
    const body = createReadableStream(['ok'])
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body,
    })

    const { result } = renderHook(() => useAIGeneration())

    await act(async () => {
      await result.current.generateInterpretation({
        chartData: { subject: { name: 'Test' } },
        chartType: 'composite',
        relationshipType: 'romantic',
      })
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.relationshipType).toBe('romantic')
    expect(callBody.chartType).toBe('composite')
  })

  it('accumulates streamed text and returns it', async () => {
    const body = createReadableStream(['Hello ', 'streaming ', 'world'])
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body,
    })

    const { result } = renderHook(() => useAIGeneration())

    let output: { text: string } | undefined
    await act(async () => {
      output = await result.current.generateInterpretation({
        chartData: {},
        chartType: 'natal',
      })
    })

    expect(output?.text).toBe('Hello streaming world')
  })

  it('calls onStreamUpdate with accumulated text on each chunk', async () => {
    const body = createReadableStream(['A', 'B', 'C'])
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body,
    })

    const { result } = renderHook(() => useAIGeneration())
    const onStreamUpdate = vi.fn()

    await act(async () => {
      await result.current.generateInterpretation({ chartData: {}, chartType: 'natal' }, onStreamUpdate)
    })

    expect(onStreamUpdate).toHaveBeenCalledTimes(3)
    expect(onStreamUpdate).toHaveBeenNthCalledWith(1, 'A')
    expect(onStreamUpdate).toHaveBeenNthCalledWith(2, 'AB')
    expect(onStreamUpdate).toHaveBeenNthCalledWith(3, 'ABC')
  })

  it('extracts debug headers from response', async () => {
    const body = createReadableStream(['text'])
    const headers = new Headers({
      'X-AI-Context': btoa('debug-context-value'),
      'X-AI-User-Prompt': btoa('debug-user-prompt-value'),
    })
    mockFetch.mockResolvedValue({
      ok: true,
      headers,
      body,
    })

    const { result } = renderHook(() => useAIGeneration())

    let output: { text: string; debugContext?: string; debugUserPrompt?: string } | undefined
    await act(async () => {
      output = await result.current.generateInterpretation({ chartData: {}, chartType: 'natal' })
    })

    expect(output?.debugContext).toBe('debug-context-value')
    expect(output?.debugUserPrompt).toBe('debug-user-prompt-value')
  })

  it('returns undefined debug fields when headers are absent', async () => {
    const body = createReadableStream(['text'])
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body,
    })

    const { result } = renderHook(() => useAIGeneration())

    let output: { debugContext?: string; debugUserPrompt?: string } | undefined
    await act(async () => {
      output = await result.current.generateInterpretation({ chartData: {}, chartType: 'natal' })
    })

    expect(output?.debugContext).toBeUndefined()
    expect(output?.debugUserPrompt).toBeUndefined()
  })

  it('throws on non-ok response with error message from body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Rate limit exceeded' }),
    })

    const { result } = renderHook(() => useAIGeneration())

    await expect(
      act(async () => {
        await result.current.generateInterpretation({ chartData: {}, chartType: 'natal' })
      }),
    ).rejects.toThrow('Rate limit exceeded')
  })

  it('throws fallback message when error response has no error field', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({}),
    })

    const { result } = renderHook(() => useAIGeneration())

    await expect(
      act(async () => {
        await result.current.generateInterpretation({ chartData: {}, chartType: 'natal' })
      }),
    ).rejects.toThrow('Failed to generate interpretation')
  })

  it('throws when response body is null', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body: null,
    })

    const { result } = renderHook(() => useAIGeneration())

    await expect(
      act(async () => {
        await result.current.generateInterpretation({ chartData: {}, chartType: 'natal' })
      }),
    ).rejects.toThrow('No response body')
  })

  it('passes abort signal to fetch', async () => {
    const body = createReadableStream(['ok'])
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body,
    })

    const { result } = renderHook(() => useAIGeneration())
    const controller = new AbortController()

    await act(async () => {
      await result.current.generateInterpretation({ chartData: {}, chartType: 'natal' }, undefined, controller.signal)
    })

    expect(mockFetch.mock.calls[0][1].signal).toBe(controller.signal)
  })

  it('falls back to empty string for unknown chart type prompt', async () => {
    const body = createReadableStream(['ok'])
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body,
    })

    const { result } = renderHook(() => useAIGeneration())

    await act(async () => {
      await result.current.generateInterpretation({ chartData: {}, chartType: 'unknown_type' })
    })

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.chartTypePrompt).toBe('')
  })
})
