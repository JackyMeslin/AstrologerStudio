import { useQuery } from '@tanstack/react-query'
import { getSolarReturnChart, getLunarReturnChart } from '@/actions/astrology'
import { Subject } from '@/types/subjects'
import { PlanetaryReturnRequestOptions } from '@/types/astrology'

type PlanetaryReturnType = 'solar' | 'lunar'

const apiByType = {
  solar: getSolarReturnChart,
  lunar: getLunarReturnChart,
} as const

export function usePlanetaryReturnChart(
  type: PlanetaryReturnType,
  subject: Subject | null | undefined,
  options?: PlanetaryReturnRequestOptions,
) {
  return useQuery({
    queryKey: [`${type}-return-chart`, subject?.id, JSON.stringify(options)],
    queryFn: () => {
      if (!subject) throw new Error('Subject is required')
      return apiByType[type](subject, options)
    },
    enabled: !!subject && !!options,
    placeholderData: (previousData) => previousData,
  })
}
