'use client'

import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { getSubjectById } from '@/actions/subjects'
import type { Subject } from '@/types/subjects'

/**
 * Hook to fetch a subject by ID for chart views.
 * Provides a standardized interface for subject queries across all chart view components.
 *
 * @param subjectId - The ID of the subject to fetch
 * @returns React Query result with subject data, loading state, and error
 */
export function useChartSubject(subjectId: string): UseQueryResult<Subject | null, Error> {
  return useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubjectById(subjectId),
  })
}
