'use client'

import { useMemo, useState } from 'react'
import { addDays, addMonths, addYears, endOfDay, startOfDay, startOfToday } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import type { EphemerisArray } from '@/types/ephemeris'
import {
  type EphemerisChartRow,
  type EphemerisTableRow,
  type PlanetKey,
  type PlanetColors,
  ALL_PLANET_KEYS,
  toColumnKey,
} from '../types/ephemeris-view'
import { PLANET_COLORS } from '@/lib/config/chart-colors'
import type { TimeRange } from '@/components/TimeRangeSelector'

/**
 * Convert decimal degrees to sexagesimal format
 * @param decimalDegrees - The decimal degree value to convert
 * @param includeSeconds - Whether to include seconds in the output (default: true)
 * @returns Formatted string: "DD°MM'SS"" if includeSeconds, otherwise "DD°MM'"
 * @example
 * toSexagesimal(123.456)       // "123°27'22""
 * toSexagesimal(123.456, false) // "123°27'"
 */
function toSexagesimal(decimalDegrees: number, includeSeconds = true): string {
  const degrees = Math.floor(decimalDegrees)
  const decimalMinutes = (decimalDegrees - degrees) * 60
  const minutes = Math.floor(decimalMinutes)

  if (includeSeconds) {
    const seconds = Math.round((decimalMinutes - minutes) * 60)
    return `${degrees}°${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"`
  }

  return `${degrees}°${String(minutes).padStart(2, '0')}'`
}

export function mapToTable(data: EphemerisArray): EphemerisTableRow[] {
  return data.map((item) => {
    const date = new Date(item.date)
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' })

    const byName = new Map(item.planets.map((p) => [p.name, p]))
    const val = (name: string) => {
      const p = byName.get(name)
      return p ? `${p.emoji} ${toSexagesimal(p.position)}` : '-'
    }

    // Build the row dynamically
    const row: Record<string, number | string> = {
      id: date.getTime(),
      date: fmt.format(date),
      time: '', // Time column hidden but kept for type compatibility
    }

    // Add all points
    for (const point of ALL_PLANET_KEYS) {
      const key = toColumnKey(point)
      row[key] = val(point)
    }

    return row as EphemerisTableRow
  })
}

export function mapToChart(data: EphemerisArray): EphemerisChartRow[] {
  return data.map((item) => {
    const date = new Date(item.date)
    const byName = new Map(item.planets.map((p) => [p.name, p]))
    const chartValue = (name: string) => {
      const p = byName.get(name)
      return p ? Number(p.abs_pos.toFixed(3)) : undefined
    }
    const tooltipValue = (name: string) => {
      const p = byName.get(name)
      return p ? toSexagesimal(p.position) + '  ' + p.emoji : undefined
    }

    // Build the row dynamically
    const row: Partial<EphemerisChartRow> = {
      date: date.toISOString(),
    }

    // Add all points
    for (const point of ALL_PLANET_KEYS) {
      row[point] = chartValue(point)
      ;(row as Record<string, string | undefined>)[`${point}Label`] = tooltipValue(point)
    }

    return row as EphemerisChartRow
  })
}

export function useEphemerisView(data: EphemerisArray) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month')

  // Derive the effective date range from timeRange
  const range = useMemo<DateRange | undefined>(() => {
    const from = startOfToday()

    switch (timeRange) {
      case 'week':
        return { from, to: addDays(from, 7) }
      case 'month':
        return { from, to: addMonths(from, 1) }
      case 'year':
        return { from, to: addYears(from, 1) }
      default:
        return { from, to: addMonths(from, 1) }
    }
  }, [timeRange])

  const filtered = useMemo(() => {
    const todayStart = startOfDay(startOfToday()).getTime()
    const hasRange = !!range?.from || !!range?.to
    const from = range?.from ? Math.max(startOfDay(range.from).getTime(), todayStart) : todayStart
    const to = range?.to ? endOfDay(range.to).getTime() : Infinity
    const src = hasRange ? data : data
    return src.filter((item) => {
      const t = new Date(item.date).getTime()
      return t >= from && t <= to
    })
  }, [data, range])

  const tableData = useMemo(() => mapToTable(filtered), [filtered])
  const chartData = useMemo(() => mapToChart(filtered), [filtered])

  const planetKeys: readonly PlanetKey[] = useMemo(() => ALL_PLANET_KEYS, [])

  // Use centralized planet colors from config
  const colors: PlanetColors = PLANET_COLORS

  return { timeRange, setTimeRange, range, filtered, tableData, chartData, planetKeys, colors }
}
