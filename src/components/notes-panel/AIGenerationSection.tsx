'use client'

import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/** Mapping of AI school keys to display names */
const SCHOOL_DISPLAY_NAMES: Record<string, string> = {
  modern: 'Modern Astrology',
  traditional: 'Traditional Astrology',
  psychological: 'Psychological Astrology',
  evolutionary: 'Evolutionary Astrology',
  vedic: 'Vedic Astrology',
  custom: 'Custom',
}

export interface AIGenerationSectionProps {
  /** Currently selected AI interpretation school */
  selectedSchool: string
  /** AI usage data with remaining/limit info */
  usageData?: { remaining: number; limit: number } | null
  /** Whether AI generation is in progress */
  isGenerating: boolean
  /** Whether to show the relationship type selector */
  showRelationshipSelector?: boolean
  /** Current relationship type */
  relationshipType: string
  /** Callback when relationship type changes */
  onRelationshipTypeChange: (type: string) => void
  /** Callback to generate AI interpretation */
  onGenerate: () => void
  /** Callback to stop AI generation */
  onStop: () => void
}

/**
 * AI generation section component.
 * Displays the AI interpretation controls including school badge,
 * usage counter, relationship selector, and generate/stop button.
 */
export function AIGenerationSection({
  selectedSchool,
  usageData,
  isGenerating,
  showRelationshipSelector = false,
  relationshipType,
  onRelationshipTypeChange,
  onGenerate,
  onStop,
}: AIGenerationSectionProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-medium leading-none">AI Interpretation</h3>
            {isGenerating && (
              <span className="sr-only" role="status" aria-live="polite">
                Generating AI interpretation...
              </span>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] uppercase tracking-wider font-normal bg-background/50"
              >
                {SCHOOL_DISPLAY_NAMES[selectedSchool] || selectedSchool}
              </Badge>
              {usageData && (
                <>
                  <span>•</span>
                  <span>
                    {usageData.remaining}/{usageData.limit} left
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {showRelationshipSelector && (
            <Select value={relationshipType} onValueChange={onRelationshipTypeChange} disabled={isGenerating}>
              <SelectTrigger className="w-full sm:w-[130px] h-9">
                <SelectValue placeholder="Relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generic">Generic</SelectItem>
                <SelectItem value="romantic">Romantic</SelectItem>
                <SelectItem value="friendship">Friendship</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="family">Family</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={isGenerating ? onStop : onGenerate}
            variant={isGenerating ? 'destructive' : 'default'}
            size="sm"
            className="h-9 px-4 w-full sm:w-auto"
            disabled={isGenerating && false /* enabled to allow stop */}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Stop
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
