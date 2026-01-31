'use client'

import { useState, useEffect, useId, useCallback } from 'react'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useUIPreferences } from '@/stores/uiPreferences'

export interface ChartLayoutConfig {
  leftColumnId: string
  rightColumnId: string
  defaultLeftItems: string[]
  defaultRightItems: string[]
}

export interface ChartLayoutResult {
  activeId: string | null
  dndContextId: string
  leftItems: string[]
  rightItems: string[]
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
}

export function useChartLayout(config: ChartLayoutConfig): ChartLayoutResult {
  const { leftColumnId, rightColumnId, defaultLeftItems, defaultRightItems } = config
  const { layout, updateLayout, moveItem } = useUIPreferences()
  const [activeId, setActiveId] = useState<string | null>(null)
  const dndContextId = useId()

  // Use nullish coalescing to allow empty columns (when all cards are dragged to one side)
  const leftItems = layout[leftColumnId] ?? defaultLeftItems
  const rightItems = layout[rightColumnId] ?? defaultRightItems

  // Initialize layout only if keys don't exist at all (first time setup)
  useEffect(() => {
    if (!(leftColumnId in layout)) {
      updateLayout(leftColumnId, defaultLeftItems)
    }
    if (!(rightColumnId in layout)) {
      updateLayout(rightColumnId, defaultRightItems)
    }
  }, [layout, updateLayout, leftColumnId, rightColumnId, defaultLeftItems, defaultRightItems])

  const findContainer = useCallback(
    (id: string) => {
      if (leftItems.includes(id)) return leftColumnId
      if (rightItems.includes(id)) return rightColumnId
      return null
    },
    [leftItems, rightItems, leftColumnId, rightColumnId],
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (!over) {
        setActiveId(null)
        return
      }

      const activeItemId = active.id as string
      const overId = over.id as string

      const activeContainer = findContainer(activeItemId)
      const overContainer =
        findContainer(overId) || (overId === leftColumnId || overId === rightColumnId ? overId : null)

      if (activeContainer && overContainer) {
        moveItem(activeItemId, overId, activeContainer, overContainer)
      }

      setActiveId(null)
    },
    [findContainer, moveItem, leftColumnId, rightColumnId],
  )

  return {
    activeId,
    dndContextId,
    leftItems,
    rightItems,
    handleDragStart,
    handleDragEnd,
  }
}
