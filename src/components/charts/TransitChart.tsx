'use client'

import { useState, useEffect, useMemo } from 'react'

import { ChartResponse } from '@/types/astrology'
import { AspectTable } from './AspectTable'
import { AspectGrid } from './AspectGrid'
import AspectsCard from '@/components/AspectsCard'
import SubjectDetailsCard from '@/components/SubjectDetailsCard'
import NatalPlanetPositionsCard from '@/components/NatalPlanetPositionsCard'
import NatalHousesPositionsCard from '@/components/NatalHousesPositionsCard'
import { ChartTabContents } from './ChartTabs'
import { useChartLayout } from '@/hooks/useChartLayout'
import { ChartLayoutGrid } from './ChartLayoutGrid'
import { useUIPreferences } from '@/stores/uiPreferences'

import { ChartDataView } from './ChartDataView'
import { NotesPanel } from '@/components/NotesPanel'
import { useAIGeneration } from '@/hooks/useAIGeneration'
import { generateChartId } from '@/lib/cache/interpretations'

interface TransitChartProps {
  data: ChartResponse
  natalData: ChartResponse
  transitData: ChartResponse
  savedChartId?: string
  initialNotes?: string
  notes?: string
  onNotesChange?: (notes: string) => void
  /** If true, shows a warning that chart data has changed since AI was generated */
  isDataStale?: boolean
  /** Label describing what the stale notes were generated for */
  staleDataLabel?: string
}

const LEFT_COLUMN_ID = 'transit-left-column'
const RIGHT_COLUMN_ID = 'transit-right-column'

const DEFAULT_LEFT_ITEMS = ['natal-subject-details-card', 'natal-planets-card', 'natal-houses-card']
const DEFAULT_RIGHT_ITEMS = ['transit-subject-details-card', 'transit-planets-card', 'transit-aspects-card']

export function TransitChart({
  data,
  natalData,
  transitData,
  savedChartId,
  initialNotes,
  notes: propNotes,
  onNotesChange,
  isDataStale = false,
  staleDataLabel,
}: TransitChartProps) {
  const { chart_wheel, chart_grid, chart_data } = data
  const [localNotes, setLocalNotes] = useState(initialNotes || '')
  const { generateInterpretation } = useAIGeneration()
  const { layout: storeLayout, updateLayout } = useUIPreferences()

  const layout = useChartLayout({
    leftColumnId: LEFT_COLUMN_ID,
    rightColumnId: RIGHT_COLUMN_ID,
    defaultLeftItems: DEFAULT_LEFT_ITEMS,
    defaultRightItems: DEFAULT_RIGHT_ITEMS,
  })

  const notes = propNotes !== undefined ? propNotes : localNotes
  const handleNotesChange = onNotesChange || setLocalNotes

  // Generate unique chartId for IndexedDB caching
  // For transits, use only the date (not time) since transit time is always "now"
  const chartId = useMemo(() => {
    const subjectName = natalData.chart_data.subject.name
    const natalDate = natalData.chart_data.subject.iso_formatted_utc_datetime || ''
    // Extract only date portion (YYYY-MM-DD) from transit datetime
    const transitDateFull = transitData.chart_data.subject.iso_formatted_utc_datetime || ''
    const transitDate = transitDateFull.split('T')[0] || ''
    return generateChartId('transit', subjectName, natalDate, undefined, transitDate)
  }, [
    natalData.chart_data.subject.name,
    natalData.chart_data.subject.iso_formatted_utc_datetime,
    transitData.chart_data.subject.iso_formatted_utc_datetime,
  ])

  // Transit-specific: ensure 'natal-houses-card' exists and deduplicate items
  useEffect(() => {
    const currentLeft = storeLayout[LEFT_COLUMN_ID] || []
    const currentRight = storeLayout[RIGHT_COLUMN_ID] || []
    const allCurrentItems = [...new Set([...currentLeft, ...currentRight])]

    if (!allCurrentItems.includes('natal-houses-card')) {
      updateLayout(LEFT_COLUMN_ID, [
        ...new Set([...(storeLayout[LEFT_COLUMN_ID] || DEFAULT_LEFT_ITEMS), 'natal-houses-card']),
      ])
    }

    // Clean up duplicates if they exist
    const leftSet = new Set(currentLeft)
    const rightSet = new Set(currentRight)
    const hasDuplicatesInLeft = currentLeft.length !== leftSet.size
    const hasDuplicatesInRight = currentRight.length !== rightSet.size
    const hasOverlap = [...leftSet].some((id) => rightSet.has(id))

    if (hasDuplicatesInLeft || hasDuplicatesInRight || hasOverlap) {
      const cleanLeft = [...leftSet]
      const cleanRight = [...rightSet].filter((id) => !leftSet.has(id))
      updateLayout(LEFT_COLUMN_ID, cleanLeft)
      updateLayout(RIGHT_COLUMN_ID, cleanRight)
    }
  }, [storeLayout, updateLayout])

  // Fallback to 'chart' if 'chart_wheel' is missing (backward compatibility)
  const mainChart = chart_wheel || data.chart

  // Deduplicate items to prevent React key errors (transit-specific)
  const leftItems = [...new Set(layout.leftItems)]
  const rightItems = [...new Set(layout.rightItems)].filter((id) => !leftItems.includes(id))

  const renderCard = (id: string) => {
    switch (id) {
      case 'natal-subject-details-card':
        return <SubjectDetailsCard id={id} subject={natalData.chart_data} className="h-fit w-full" />
      case 'natal-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={natalData.chart_data.subject}
            className="h-fit w-full"
            title="Natal Points"
          />
        )
      case 'transit-subject-details-card':
        return <SubjectDetailsCard id={id} subject={transitData.chart_data} className="h-fit w-full" />
      case 'transit-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={transitData.chart_data.subject}
            className="h-fit w-full"
            projectedPoints={chart_data.house_comparison?.second_points_in_first_houses}
            title="Transit Points"
          />
        )
      case 'natal-houses-card':
        return <NatalHousesPositionsCard id={id} subject={natalData.chart_data.subject} className="h-fit w-full" />
      case 'aspects-card':
        return chart_grid ? <AspectsCard id={id} html={chart_grid} className="w-full" /> : null
      case 'transit-aspects-card':
        return chart_grid ? (
          <AspectsCard id={id} html={chart_grid} className="w-full" rowLabel="Natal" colLabel="Transit" />
        ) : null
      default:
        return null
    }
  }

  const handleGenerateAI = async (onStreamUpdate?: (text: string) => void, signal?: AbortSignal) => {
    return generateInterpretation(
      { chartData: data.chart_data, chartType: 'transit' },
      onStreamUpdate,
      signal,
    )
  }

  // Override layout items with deduplicated versions for TransitChart
  const transitLayout = { ...layout, leftItems, rightItems }

  const chartContent = (
    <ChartLayoutGrid
      layout={transitLayout}
      leftColumnId={LEFT_COLUMN_ID}
      rightColumnId={RIGHT_COLUMN_ID}
      mainChart={mainChart}
      renderCard={renderCard}
    />
  )

  const aspectsContent = (
    <AspectTable
      aspects={chart_data.aspects}
      className="mx-auto w-full max-w-8xl"
      p1Label={natalData.chart_data.subject.name}
      p2Label="Transit"
    />
  )

  const dataContent = (
    <div className="mx-auto w-full max-w-8xl">
      <ChartDataView
        data={natalData}
        secondaryData={transitData}
        primaryLabel={natalData.chart_data.subject.name}
        secondaryLabel="Transit"
        chartType="transit"
        houseComparison={chart_data.house_comparison}
        aspects={chart_data.aspects}
      />
    </div>
  )

  const interpretationContent = (
    <NotesPanel
      savedChartId={savedChartId}
      initialNotes={initialNotes}
      notes={notes}
      onNotesChange={handleNotesChange}
      onGenerateAI={handleGenerateAI}
      isDataStale={isDataStale}
      staleDataLabel={staleDataLabel}
      chartId={chartId}
    />
  )

  const gridContent = (
    <AspectGrid
      aspects={chart_data.aspects}
      type="double"
      className="mx-auto w-full max-w-8xl"
      activePoints={chart_data.active_points}
      rowLabel="Natal"
      colLabel="Transit"
      rowSubject={natalData.chart_data.subject}
      colSubject={transitData.chart_data.subject}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <ChartTabContents
        chartContent={chartContent}
        aspectsContent={aspectsContent}
        gridContent={gridContent}
        dataContent={dataContent}
        interpretationContent={interpretationContent}
        aspects={chart_data.aspects}
        activePoints={chart_data.active_points}
        aspectFilterType="double"
        primaryFilterLabel="Natal Planets"
        secondaryFilterLabel="Transit Planets"
      />
    </div>
  )
}
