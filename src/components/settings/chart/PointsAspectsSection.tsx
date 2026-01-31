'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ALL_ASPECTS } from '@/lib/astrology/aspects'
import { ALL_CELESTIAL_POINTS } from '@/lib/astrology/celestial-points'
import { DEFAULT_PREFERENCES } from '../ChartSettingsPanel'
import { type ChartSettingsSectionProps } from './types'

// Point categories for organization
const TRADITIONAL_PLANETS = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
]
const LUNAR_NODES = ['Mean_North_Lunar_Node', 'True_North_Lunar_Node', 'Mean_South_Lunar_Node', 'True_South_Lunar_Node']
const CENTAURS_MINOR = ['Chiron', 'Pholus', 'Mean_Lilith', 'True_Lilith']
const ASTEROIDS = ['Ceres', 'Pallas', 'Juno', 'Vesta', 'Eris']
const TRANS_NEPTUNIAN = ['Sedna', 'Haumea', 'Makemake', 'Ixion', 'Orcus', 'Quaoar']
const FIXED_STARS = ['Regulus', 'Spica']
const ARABIC_PARTS = ['Pars_Fortunae', 'Pars_Spiritus', 'Pars_Amoris', 'Pars_Fidei']
const CHART_ANGLES = ['Ascendant', 'Medium_Coeli', 'Descendant', 'Imum_Coeli', 'Vertex', 'Anti_Vertex', 'Earth']

// Points used for distribution weights
const WEIGHT_POINTS = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Ascendant',
  'Medium_Coeli',
  'Descendant',
  'Imum_Coeli',
]

/**
 * Get the default weight for a celestial point based on its astrological importance.
 */
function getDefaultWeight(point: string): number {
  const p = point.toLowerCase()
  if (['sun', 'moon', 'ascendant'].includes(p)) return 2
  if (['mercury', 'venus', 'mars', 'medium_coeli'].includes(p)) return 1.5
  return 1
}

/**
 * Format a lunar node name for display.
 */
function formatLunarNodeLabel(point: string): string {
  if (point === 'True_North_Lunar_Node') return 'North Node (True)'
  if (point === 'True_South_Lunar_Node') return 'South Node (True)'
  if (point === 'Mean_North_Lunar_Node') return 'North Node (Mean)'
  if (point === 'Mean_South_Lunar_Node') return 'South Node (Mean)'
  return point.replace(/_/g, ' ')
}

interface PointCheckboxProps {
  point: string
  checked: boolean
  onCheckedChange: (point: string, checked: boolean) => void
  label?: string
}

function PointCheckbox({ point, checked, onCheckedChange, label }: PointCheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`point-${point}`}
        checked={checked}
        onCheckedChange={(checked) => onCheckedChange(point, checked as boolean)}
      />
      <label
        htmlFor={`point-${point}`}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label || point.replace(/_/g, ' ')}
      </label>
    </div>
  )
}

interface PointGroupProps {
  title: string
  description: string
  points: string[]
  activePoints: string[]
  onPointToggle: (point: string, checked: boolean) => void
  formatLabel?: (point: string) => string
  gridCols?: string
}

function PointGroup({
  title,
  description,
  points,
  activePoints,
  onPointToggle,
  formatLabel,
  gridCols = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
}: PointGroupProps) {
  return (
    <div className="space-y-3 border rounded-lg p-4">
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className={`grid ${gridCols} gap-3`}>
        {points.map((point) => (
          <PointCheckbox
            key={point}
            point={point}
            checked={activePoints.includes(point)}
            onCheckedChange={onPointToggle}
            label={formatLabel ? formatLabel(point) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Settings for active celestial points, aspects, and distribution weights.
 */
export function PointsAspectsSection({ prefs, setPrefs }: ChartSettingsSectionProps) {
  const handlePointToggle = (point: string, checked: boolean) => {
    setPrefs((p) => {
      const current = p.active_points
      let newPoints = [...current]
      if (checked) {
        if (!newPoints.includes(point)) newPoints.push(point)
      } else {
        newPoints = newPoints.filter((x) => x !== point)
        if (newPoints.length < 2) {
          newPoints = ['Sun', 'Moon']
          toast.info('Sun and Moon kept as minimum active points', {
            description: 'At least two points must be active.',
          })
        }
      }
      return { ...p, active_points: newPoints }
    })
  }

  const handleAngleToggle = (point: string, checked: boolean) => {
    setPrefs((p) => {
      const current = p.active_points
      let newPoints = [...current]
      if (checked) {
        if (!newPoints.includes(point)) newPoints.push(point)
      } else {
        newPoints = newPoints.filter((x) => x !== point)
      }
      return { ...p, active_points: newPoints }
    })
  }

  const handleAspectToggle = (aspectName: string, checked: boolean) => {
    setPrefs((prev) => {
      const currentAspects = prev.active_aspects || []
      if (checked) {
        if (!currentAspects.find((a) => a.name === aspectName)) {
          const defaultOrb = ALL_ASPECTS.find((a) => a.name === aspectName)?.defaultOrb || 5
          return { ...prev, active_aspects: [...currentAspects, { name: aspectName, orb: defaultOrb }] }
        }
        return prev
      } else {
        return { ...prev, active_aspects: currentAspects.filter((a) => a.name !== aspectName) }
      }
    })
  }

  const handleAspectOrbChange = (aspectName: string, orb: number) => {
    setPrefs((prev) => {
      const currentAspects = prev.active_aspects || []
      return {
        ...prev,
        active_aspects: currentAspects.map((a) => (a.name === aspectName ? { ...a, orb } : a)),
      }
    })
  }

  const handleWeightChange = (point: string, weight: number) => {
    setPrefs((prev) => ({
      ...prev,
      custom_distribution_weights: {
        ...prev.custom_distribution_weights,
        [point]: weight,
      },
    }))
  }

  return (
    <div className="space-y-6">
      {/* Active Points */}
      <Card>
        <CardHeader>
          <CardTitle>Active Celestial Points</CardTitle>
          <CardDescription>
            Select which celestial bodies and chart points to include in your astrological calculations. Deselected
            points will be excluded from all charts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-start gap-2">
            <div className="flex items-center rounded-md border p-1 gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setPrefs((p) => ({ ...p, active_points: [...ALL_CELESTIAL_POINTS] }))
                }}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setPrefs((p) => ({ ...p, active_points: ['Sun', 'Moon'] }))
                  toast.info('Sun and Moon kept as minimum active points', {
                    description: 'At least two points must be active to avoid default API behavior.',
                  })
                }}
              >
                Deselect All
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                setPrefs((p) => ({
                  ...p,
                  active_points: DEFAULT_PREFERENCES.active_points,
                  active_aspects: DEFAULT_PREFERENCES.active_aspects,
                }))
                toast.success('Restored to defaults', {
                  description: 'Active points and aspects have been reset.',
                })
              }}
            >
              Reset to Default
            </Button>
          </div>

          <PointGroup
            title="Traditional Planets"
            description="The primary celestial bodies in classical astrology."
            points={TRADITIONAL_PLANETS}
            activePoints={prefs.active_points}
            onPointToggle={handlePointToggle}
            gridCols="grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          />

          <PointGroup
            title="Lunar Nodes"
            description="Points where the Moon's orbit intersects the ecliptic."
            points={LUNAR_NODES}
            activePoints={prefs.active_points}
            onPointToggle={handlePointToggle}
            formatLabel={formatLunarNodeLabel}
            gridCols="grid-cols-2 md:grid-cols-4"
          />

          <PointGroup
            title="Centaurs & Minor Bodies"
            description="Chiron, Pholus, and Lilith (Black Moon)."
            points={CENTAURS_MINOR}
            activePoints={prefs.active_points}
            onPointToggle={handlePointToggle}
            gridCols="grid-cols-2 md:grid-cols-4"
          />

          <PointGroup
            title="Asteroids"
            description="Major asteroids in the asteroid belt and beyond."
            points={ASTEROIDS}
            activePoints={prefs.active_points}
            onPointToggle={handlePointToggle}
            gridCols="grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          />

          <PointGroup
            title="Trans-Neptunian Objects"
            description="Distant objects beyond Neptune's orbit."
            points={TRANS_NEPTUNIAN}
            activePoints={prefs.active_points}
            onPointToggle={handlePointToggle}
            gridCols="grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          />

          <PointGroup
            title="Fixed Stars"
            description="Important fixed stars used in astrological analysis."
            points={FIXED_STARS}
            activePoints={prefs.active_points}
            onPointToggle={handlePointToggle}
            gridCols="grid-cols-2 md:grid-cols-2"
          />

          <PointGroup
            title="Arabic Parts"
            description="Calculated points based on planetary positions."
            points={ARABIC_PARTS}
            activePoints={prefs.active_points}
            onPointToggle={handlePointToggle}
            gridCols="grid-cols-2 md:grid-cols-4"
          />

          {/* Chart Angles - uses different handler that doesn't enforce minimum */}
          <div className="space-y-3 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Chart Angles & Special Points</h4>
            <p className="text-xs text-muted-foreground">Angles of the chart and other calculated points.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {CHART_ANGLES.map((point) => (
                <PointCheckbox
                  key={point}
                  point={point}
                  checked={prefs.active_points.includes(point)}
                  onCheckedChange={handleAngleToggle}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Aspects */}
      <Card>
        <CardHeader>
          <CardTitle>Active Aspects</CardTitle>
          <CardDescription>
            Define which aspects to calculate between celestial points and set their orb tolerances (in degrees).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ALL_ASPECTS.map((aspect) => {
              const isActive = !!prefs.active_aspects?.find((a) => a.name === aspect.name)
              const currentOrb = prefs.active_aspects?.find((a) => a.name === aspect.name)?.orb ?? aspect.defaultOrb

              return (
                <div key={aspect.name} className="flex items-center justify-between space-x-4 border p-3 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`aspect-${aspect.name}`}
                      checked={isActive}
                      onCheckedChange={(checked) => handleAspectToggle(aspect.name, checked as boolean)}
                    />
                    <label htmlFor={`aspect-${aspect.name}`} className="text-sm font-medium leading-none capitalize">
                      {aspect.name}
                    </label>
                  </div>
                  {isActive && (
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`orb-${aspect.name}`} className="text-xs text-muted-foreground">
                        Orb (°)
                      </Label>
                      <Input
                        id={`orb-${aspect.name}`}
                        type="number"
                        step="0.5"
                        className="w-20 h-8"
                        value={currentOrb}
                        onChange={(e) => handleAspectOrbChange(aspect.name, parseFloat(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Distribution & Weights */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution & Weights</CardTitle>
          <CardDescription>
            Control how planetary influences are weighted when calculating element and modality distributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="points-distribution-method">Distribution Method</Label>
            <p className="text-sm text-muted-foreground">
              Choose between weighted (traditional astrological importance) or pure count (equal weight for all points).
            </p>
            <Select
              value={prefs.distribution_method}
              onValueChange={(val) => setPrefs((p) => ({ ...p, distribution_method: val }))}
            >
              <SelectTrigger id="points-distribution-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weighted">Weighted (Traditional)</SelectItem>
                <SelectItem value="pure_count">Pure Count (Equal Weight)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {prefs.distribution_method === 'weighted' && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-sm font-medium">Custom Weights</p>
                <p className="text-sm text-muted-foreground">
                  Fine-tune the relative importance of each planet and angle. Higher values = greater influence.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ALL_CELESTIAL_POINTS.filter((p: string) => WEIGHT_POINTS.includes(p)).map((point) => (
                  <div key={point} className="space-y-1">
                    <Label htmlFor={`weight-${point}`} className="text-xs text-muted-foreground">
                      {point.replace(/_/g, ' ')}
                    </Label>
                    <Input
                      id={`weight-${point}`}
                      type="number"
                      step="0.5"
                      className="h-8"
                      value={prefs.custom_distribution_weights?.[point.toLowerCase()] ?? getDefaultWeight(point)}
                      onChange={(e) => handleWeightChange(point.toLowerCase(), parseFloat(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
