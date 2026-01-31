'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HOUSE_SYSTEMS, PERSPECTIVE_TYPES, SIDEREAL_MODES, ZODIAC_SYSTEMS } from '@/lib/astrology/celestial-points'
import { type ChartSettingsSectionProps } from './types'

/**
 * Calculation settings for zodiac system, house system, perspective type, and rulership mode.
 */
export function CalculationSection({ prefs, setPrefs }: ChartSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zodiac System</CardTitle>
          <CardDescription>Choose the zodiac calculation system and reference frame.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="calc-zodiac-system">Zodiac System</Label>
              <p className="text-sm text-muted-foreground">
                Tropical (Western astrology) or Sidereal (Vedic/Eastern astrology).
              </p>
              <Select
                value={prefs.default_zodiac_system}
                onValueChange={(val) => setPrefs((p) => ({ ...p, default_zodiac_system: val }))}
              >
                <SelectTrigger id="calc-zodiac-system">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZODIAC_SYSTEMS.map((sys) => (
                    <SelectItem key={sys.value} value={sys.value}>
                      {sys.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {prefs.default_zodiac_system === 'Sidereal' && (
              <div className="space-y-2">
                <Label htmlFor="calc-sidereal-mode">Sidereal Mode (Ayanamsa)</Label>
                <p className="text-sm text-muted-foreground">
                  The specific ayanamsa (precession offset) used for Sidereal calculations.
                </p>
                <Select
                  value={prefs.default_sidereal_mode}
                  onValueChange={(val) => setPrefs((p) => ({ ...p, default_sidereal_mode: val }))}
                >
                  <SelectTrigger id="calc-sidereal-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIDEREAL_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rulership System</CardTitle>
          <CardDescription>Select the system used for determining sign rulerships.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="calc-rulership-mode">Rulership Mode</Label>
            <p className="text-sm text-muted-foreground">
              Classical (Mars rules Scorpio) or Modern (Pluto rules Scorpio).
            </p>
            <Select
              value={prefs.rulership_mode || 'modern'}
              onValueChange={(val) => setPrefs((p) => ({ ...p, rulership_mode: val as 'classical' | 'modern' }))}
            >
              <SelectTrigger id="calc-rulership-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classical">Classical (Traditional)</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>House System & Perspective</CardTitle>
          <CardDescription>Define how houses are calculated and the observational perspective.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="calc-house-system">House System</Label>
              <p className="text-sm text-muted-foreground">
                The mathematical method used to divide the chart into houses.
              </p>
              <Select
                value={prefs.house_system}
                onValueChange={(val) => setPrefs((p) => ({ ...p, house_system: val }))}
              >
                <SelectTrigger id="calc-house-system">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUSE_SYSTEMS.map((sys) => (
                    <SelectItem key={sys.value} value={sys.value}>
                      {sys.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calc-perspective-type">Perspective Type</Label>
              <p className="text-sm text-muted-foreground">
                Geocentric (Earth-centered) or Heliocentric (Sun-centered) planetary positions.
              </p>
              <Select
                value={prefs.perspective_type}
                onValueChange={(val) => setPrefs((p) => ({ ...p, perspective_type: val }))}
              >
                <SelectTrigger id="calc-perspective-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSPECTIVE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
