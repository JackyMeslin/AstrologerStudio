'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PlanetKey, PlanetColors, EphemerisChartRow } from '@/types/ephemeris-view'

interface EphemerisChartContentProps {
  chartData: EphemerisChartRow[]
  planetKeys: readonly PlanetKey[]
  enabled: Record<PlanetKey, boolean>
  colors: PlanetColors
  CustomTooltip: React.FC
}

/**
 * Internal chart component that renders the actual recharts AreaChart.
 * This component is dynamically imported to avoid loading recharts in the initial bundle.
 */
export function EphemerisChartContent({
  chartData,
  planetKeys,
  enabled,
  colors,
  CustomTooltip,
}: EphemerisChartContentProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          {planetKeys.map((planet) => (
            <linearGradient key={planet} id={`color-${planet}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[planet].stroke} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[planet].stroke} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
        <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} className="text-xs" />
        <YAxis domain={[0, 360]} tickFormatter={(value) => `${value}°`} className="text-xs" />
        <Tooltip content={<CustomTooltip />} />

        {planetKeys
          .filter((planet) => enabled[planet])
          .map((planet) => (
            <Area
              key={planet}
              type="monotone"
              dataKey={planet}
              stroke={colors[planet].stroke}
              fillOpacity={1}
              fill={`url(#color-${planet})`}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
