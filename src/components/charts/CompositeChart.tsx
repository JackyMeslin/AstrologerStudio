'use client'

import { useState, useMemo } from 'react'

import { ChartResponse } from '@/types/astrology'
import { AspectTable } from './AspectTable'
import { AspectGrid } from './AspectGrid'
import AspectsCard from '@/components/AspectsCard'
import NatalPlanetPositionsCard from '@/components/NatalPlanetPositionsCard'
import NatalHousesPositionsCard from '@/components/NatalHousesPositionsCard'
import { ChartTabContents } from './ChartTabs'
import { useChartLayout } from '@/hooks/useChartLayout'
import { ChartLayoutGrid } from './ChartLayoutGrid'

import { ChartDataView } from './ChartDataView'
import { NotesPanel } from '@/components/NotesPanel'
import { useAIGeneration } from '@/hooks/useAIGeneration'
import { generateChartId } from '@/lib/cache/interpretations'
import CompositeDetailsCard from '@/components/CompositeDetailsCard'

interface CompositeChartProps {
  data: ChartResponse
  savedChartId?: string
  initialNotes?: string
}

const LEFT_COLUMN_ID = 'composite-left-column'
const RIGHT_COLUMN_ID = 'composite-right-column'

const DEFAULT_LEFT_ITEMS = ['composite-details-card', 'composite-planets-card']
const DEFAULT_RIGHT_ITEMS = ['composite-houses-card', 'composite-aspects-card']

export function CompositeChart({ data, savedChartId, initialNotes }: CompositeChartProps) {
  const { chart_wheel, chart_grid, chart_data } = data
  const [_notes, setNotes] = useState(initialNotes || '')
  const { generateInterpretation } = useAIGeneration()

  const layout = useChartLayout({
    leftColumnId: LEFT_COLUMN_ID,
    rightColumnId: RIGHT_COLUMN_ID,
    defaultLeftItems: DEFAULT_LEFT_ITEMS,
    defaultRightItems: DEFAULT_RIGHT_ITEMS,
  })

  // Generate unique chartId for IndexedDB caching
  const chartId = useMemo(() => {
    const subjectName1 = chart_data.first_subject?.name || ''
    const subjectName2 = chart_data.second_subject?.name || ''
    return generateChartId('composite', subjectName1, '', subjectName2)
  }, [chart_data.first_subject?.name, chart_data.second_subject?.name])

  // Fallback to 'chart' if 'chart_wheel' is missing
  const mainChart = chart_wheel || data.chart

  const renderCard = (id: string) => {
    switch (id) {
      case 'composite-details-card':
        return <CompositeDetailsCard id={id} chartData={chart_data} className="h-fit w-full" />
      case 'composite-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={chart_data.subject}
            className="h-fit w-full"
            title="Composite Points"
          />
        )
      case 'composite-houses-card':
        return (
          <NatalHousesPositionsCard
            id={id}
            subject={chart_data.subject}
            className="h-fit w-full"
            title="Composite Houses"
          />
        )
      case 'composite-aspects-card':
        return chart_grid ? <AspectsCard id={id} html={chart_grid} className="w-full" /> : null
      default:
        return null
    }
  }

  const handleGenerateAI = async (
    onStreamUpdate?: (text: string) => void,
    signal?: AbortSignal,
    relationshipType?: string,
  ) => {
    return generateInterpretation(
      { chartData: data.chart_data, chartType: 'composite', relationshipType },
      onStreamUpdate,
      signal,
    )
  }

  const chartContent = (
    <ChartLayoutGrid
      layout={layout}
      leftColumnId={LEFT_COLUMN_ID}
      rightColumnId={RIGHT_COLUMN_ID}
      mainChart={mainChart}
      renderCard={renderCard}
    />
  )

  const aspectsContent = <AspectTable aspects={chart_data.aspects} className="mx-auto w-full max-w-8xl" />

  const dataContent = (
    <div className="mx-auto w-full max-w-8xl">
      <ChartDataView data={data} chartType="composite" />
    </div>
  )

  const interpretationContent = (
    <NotesPanel
      savedChartId={savedChartId}
      initialNotes={initialNotes}
      onNotesChange={setNotes}
      onGenerateAI={handleGenerateAI}
      showRelationshipSelector
      chartId={chartId}
    />
  )

  const gridContent = (
    <AspectGrid
      aspects={chart_data.aspects}
      type="single"
      className="mx-auto w-full max-w-8xl"
      activePoints={chart_data.active_points}
      rowSubject={chart_data.subject}
      colSubject={chart_data.subject}
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
      />
    </div>
  )
}
