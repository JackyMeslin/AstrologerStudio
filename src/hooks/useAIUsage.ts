import { useQuery } from '@tanstack/react-query'
import { AIUsageResponseSchema, type AIUsageResponse } from '@/types/schemas'
import { STALE_TIME } from '@/lib/config/query'

export function useAIUsage() {
  return useQuery<AIUsageResponse>({
    queryKey: ['ai-usage'],
    queryFn: async () => {
      const res = await fetch('/api/ai/usage')
      if (!res.ok) {
        throw new Error('Failed to fetch AI usage')
      }
      const data = await res.json()
      return AIUsageResponseSchema.parse(data)
    },
    staleTime: STALE_TIME.MEDIUM, // 5 minutes
  })
}
