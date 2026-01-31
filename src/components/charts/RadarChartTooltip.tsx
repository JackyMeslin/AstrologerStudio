import { memo } from 'react'
import type { ChartPoint } from '@/lib/astrology/chart-data'

/**
 * Props for the RadarChartTooltip component.
 */
export interface RadarChartTooltipProps {
  /** Whether the tooltip is currently active (from Recharts) */
  active?: boolean
  /** Payload data from Recharts containing the chart data point */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  /** Whether a secondary chart is being displayed */
  hasSecondaryData: boolean
  /** Label for the primary chart data */
  primaryLabel: string
  /** Label for the secondary chart data */
  secondaryLabel: string
}

/**
 * Custom tooltip component for radar charts displaying element/quality distributions.
 *
 * Shows detailed breakdown of points in each category, displaying both primary
 * and secondary chart data when available. This component is extracted from
 * ChartDataView to prevent recreation on every parent render.
 *
 * @example
 * ```tsx
 * <RadarChartTooltip
 *   active={true}
 *   payload={chartPayload}
 *   hasSecondaryData={true}
 *   primaryLabel="Person A"
 *   secondaryLabel="Person B"
 * />
 * ```
 */
export const RadarChartTooltip = memo(function RadarChartTooltip({
  active,
  payload,
  hasSecondaryData,
  primaryLabel,
  secondaryLabel,
}: RadarChartTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const data = payload[0].payload

  return (
    <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-xl">
      <div className="flex w-full flex-col gap-2">
        {/* Primary Subject */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-medium border-b pb-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
            <span className="capitalize">{data.subject}</span>
            {hasSecondaryData && (
              <>
                <span className="text-muted-foreground">-</span>
                <span>{primaryLabel}</span>
              </>
            )}
            <span className="ml-auto font-bold">{Math.round(data.percentage)}%</span>
          </div>
          <div className="flex flex-col gap-0.5 pl-4">
            {data.points.length > 0 ? (
              data.points.map((p: ChartPoint) => (
                <div key={p.name} className="flex items-center gap-2 text-muted-foreground text-xs">
                  <span className="w-4 text-center">{p.emoji}</span>
                  <span>{p.name.replace(/_/g, ' ')}</span>
                </div>
              ))
            ) : (
              <span className="text-muted-foreground text-xs italic">No points</span>
            )}
          </div>
        </div>

        {/* Secondary Subject */}
        {hasSecondaryData && data.secondaryPercentage !== undefined && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-medium border-b pb-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-secondary)' }} />
              <span className="capitalize">{data.subject}</span>
              <span className="text-muted-foreground">-</span>
              <span>{secondaryLabel}</span>
              <span className="ml-auto font-bold">{Math.round(data.secondaryPercentage)}%</span>
            </div>
            <div className="flex flex-col gap-0.5 pl-4">
              {data.secondaryPoints && data.secondaryPoints.length > 0 ? (
                data.secondaryPoints.map((p: ChartPoint) => (
                  <div key={p.name} className="flex items-center gap-2 text-muted-foreground text-xs">
                    <span className="w-4 text-center">{p.emoji}</span>
                    <span>{p.name.replace(/_/g, ' ')}</span>
                  </div>
                ))
              ) : (
                <span className="text-muted-foreground text-xs italic">No points</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

// Add displayName for debugging
RadarChartTooltip.displayName = 'RadarChartTooltip'
