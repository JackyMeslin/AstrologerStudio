'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'

interface ChartViewWrapperProps {
  /** Whether the subject is currently loading */
  isLoading: boolean
  /** Error from loading the subject(s), if any */
  error?: Error | null
  /** Whether the subject(s) exist after loading */
  hasSubject: boolean
  /** Custom error message (defaults to "Subject not found" or "Subject(s) not found") */
  errorMessage?: string
  /** Children to render when loading is complete and subject exists */
  children: ReactNode
}

/**
 * Wrapper component for chart views that handles common loading and error states.
 * Provides consistent UX for loading skeletons and "subject not found" error states
 * across all chart view components.
 *
 * @example
 * ```tsx
 * <ChartViewWrapper
 *   isLoading={isLoadingSubject}
 *   error={subjectError}
 *   hasSubject={!!subject}
 * >
 *   <NatalChart data={chartData} />
 * </ChartViewWrapper>
 * ```
 */
export function ChartViewWrapper({
  isLoading,
  error,
  hasSubject,
  errorMessage = 'Subject not found',
  children,
}: ChartViewWrapperProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="space-y-4 p-0 md:p-2">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (error || !hasSubject) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">{errorMessage}</h2>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
