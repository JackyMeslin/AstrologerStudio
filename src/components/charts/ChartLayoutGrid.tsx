'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import { createPortal } from 'react-dom'

import ZoomableChart from '@/components/ZoomableChart'
import { DraggableColumn } from '@/components/dnd/DraggableColumn'
import { SortableCard } from '@/components/dnd/SortableCard'
import type { ChartLayoutResult } from '@/hooks/useChartLayout'

export interface ChartLayoutGridProps {
  layout: ChartLayoutResult
  leftColumnId: string
  rightColumnId: string
  mainChart: string | null | undefined
  renderCard: (id: string) => ReactNode
}

export function ChartLayoutGrid({
  layout,
  leftColumnId,
  rightColumnId,
  mainChart,
  renderCard,
}: ChartLayoutGridProps) {
  const { activeId, dndContextId, leftItems, rightItems, handleDragStart, handleDragEnd } = layout
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <DndContext
      id={dndContextId}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="mx-auto w-full max-w-10xl h-full flex flex-col gap-6 overflow-x-visible overflow-y-clip">
        {/* Mobile chart section - hidden on lg screens */}
        <section className="flex justify-center items-center h-full w-full lg:hidden">
          {mainChart ? (
            <ZoomableChart
              html={mainChart}
              className="relative w-full h-full max-w-md flex items-center justify-center"
            />
          ) : null}
        </section>

        {/* Main content grid */}
        <main className="grid gap-8 justify-items-center grid-cols-1 md:grid-cols-2 lg:grid-cols-[2.5fr_5.65fr_2.5fr]">
          {/* Left column */}
          <DraggableColumn id={leftColumnId} items={leftItems} className="relative z-10">
            {leftItems.map((id) => (
              <SortableCard key={id} id={id}>
                {renderCard(id)}
              </SortableCard>
            ))}
          </DraggableColumn>

          {/* Center: Chart (desktop only) */}
          <section className="hidden lg:block w-full h-full relative z-0 lg:-translate-x-6">
            {mainChart ? (
              <ZoomableChart html={mainChart} className="absolute inset-0 flex items-center justify-center" />
            ) : null}
          </section>

          {/* Right column */}
          <DraggableColumn id={rightColumnId} items={rightItems} className="relative">
            {rightItems.map((id) => (
              <SortableCard key={id} id={id}>
                {renderCard(id)}
              </SortableCard>
            ))}
          </DraggableColumn>
        </main>

        {mounted &&
          createPortal(
            <DragOverlay>
              {activeId ? <div className="opacity-80 rotate-2 cursor-grabbing">{renderCard(activeId)}</div> : null}
            </DragOverlay>,
            document.body,
          )}
      </div>
    </DndContext>
  )
}
