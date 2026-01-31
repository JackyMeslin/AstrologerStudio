import { useCallback } from 'react'

import { useAIInterpretation } from '@/stores/aiInterpretationSettings'
import { CHART_TYPE_PROMPTS } from '@/lib/ai/prompts'
import type { AIGenerationResult } from '@/components/NotesPanel'
import type { ChartData } from '@/types/astrology'

interface AIGenerationParams {
  chartData: ChartData | Record<string, unknown>
  chartType: string
  relationshipType?: string
}

/**
 * Hook that provides a stable `generateInterpretation` callback for AI chart interpretation.
 *
 * Encapsulates the shared logic: POST to `/api/ai/interpret`, streaming response reading,
 * debug header extraction, and text accumulation.
 *
 * Each chart component prepares its own `chartData` / `chartType` and passes them in.
 */
export function useAIGeneration() {
  const { language, getActivePrompt, include_house_comparison } = useAIInterpretation()

  const generateInterpretation = useCallback(
    async (
      params: AIGenerationParams,
      onStreamUpdate?: (text: string) => void,
      signal?: AbortSignal,
    ): Promise<AIGenerationResult> => {
      const { chartData, chartType, relationshipType } = params

      const response = await fetch('/api/ai/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartData,
          chartType,
          systemPrompt: getActivePrompt(),
          chartTypePrompt: CHART_TYPE_PROMPTS[chartType] || '',
          language,
          include_house_comparison,
          relationshipType,
        }),
        signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate interpretation')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')

      // Extract debug headers (base64 encoded)
      const debugContextB64 = response.headers.get('X-AI-Context')
      const debugUserPromptB64 = response.headers.get('X-AI-User-Prompt')
      const debugContext = debugContextB64 ? atob(debugContextB64) : undefined
      const debugUserPrompt = debugUserPromptB64 ? atob(debugUserPromptB64) : undefined

      let accumulatedText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulatedText += chunk
        onStreamUpdate?.(accumulatedText)
      }

      return { text: accumulatedText, debugContext, debugUserPrompt }
    },
    [language, getActivePrompt, include_house_comparison],
  )

  return { generateInterpretation }
}
