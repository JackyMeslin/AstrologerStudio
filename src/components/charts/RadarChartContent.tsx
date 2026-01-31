'use client'

import { useCallback } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent, ChartConfig } from '@/components/ui/chart'
import type { RadarDataPoint } from '@/lib/astrology/chart-data'
import { RadarChartTooltip, type RadarChartTooltipProps } from './RadarChartTooltip'

interface RadarChartContentProps {
  data: RadarDataPoint[]
  chartConfig: ChartConfig
  chartColors: {
    grid: string
    text: string
  }
  radarColors: {
    primaryFill: string
    primaryStroke: string
    secondaryFill: string
    secondaryStroke: string
  }
  hasSecondaryData: boolean
  /** Label for the primary chart data (for tooltip) */
  primaryLabel: string
  /** Label for the secondary chart data (for tooltip) */
  secondaryLabel: string
}

/**
 * Internal radar chart component that renders the actual recharts RadarChart.
 * This component is dynamically imported to avoid loading recharts in the initial bundle.
 */
export function RadarChartContent({
  data,
  chartConfig,
  chartColors,
  radarColors,
  hasSecondaryData,
  primaryLabel,
  secondaryLabel,
}: RadarChartContentProps) {
  // Memoize the tooltip render function to prevent recreation on each render
  const renderTooltip = useCallback(
    (props: Omit<RadarChartTooltipProps, 'hasSecondaryData' | 'primaryLabel' | 'secondaryLabel'>) => (
      <RadarChartTooltip
        {...props}
        hasSecondaryData={hasSecondaryData}
        primaryLabel={primaryLabel}
        secondaryLabel={secondaryLabel}
      />
    ),
    [hasSecondaryData, primaryLabel, secondaryLabel],
  )

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
      <RadarChart
        cx="50%"
        cy="50%"
        outerRadius="70%"
        data={data}
        margin={{ top: hasSecondaryData ? -40 : 0, bottom: hasSecondaryData ? -10 : 0 }}
      >
        <PolarGrid stroke={chartColors.grid} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: chartColors.text }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="primary" fill={radarColors.primaryFill} stroke={radarColors.primaryStroke} fillOpacity={0.6} />
        {hasSecondaryData && (
          <Radar
            dataKey="secondary"
            fill={radarColors.secondaryFill}
            stroke={radarColors.secondaryStroke}
            fillOpacity={0.6}
          />
        )}
        <ChartTooltip cursor={false} content={renderTooltip} />
        {hasSecondaryData && <ChartLegend className="mt-8" content={<ChartLegendContent />} />}
      </RadarChart>
    </ChartContainer>
  )
}
