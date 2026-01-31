import { cn } from '@/lib/utils/cn'

interface ChartLoadingSkeletonProps {
  className?: string
  height?: string | number
  variant?: 'default' | 'admin'
}

/**
 * Loading skeleton for dynamically imported chart components.
 * Displays an animated placeholder while recharts library is being loaded.
 */
export function ChartLoadingSkeleton({ className, height = 300, variant = 'default' }: ChartLoadingSkeletonProps) {
  const heightStyle = typeof height === 'number' ? `${height}px` : height

  if (variant === 'admin') {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height: heightStyle }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-400" />
          <p className="text-sm text-slate-400">Loading chart...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center', className)} style={{ height: heightStyle }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading chart...</p>
      </div>
    </div>
  )
}
