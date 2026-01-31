'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type ChartSettingsSectionProps } from './types'

const AVAILABLE_THEMES = ['classic', 'dark', 'light', 'strawberry', 'dark-high-contrast', 'black-and-white']

/**
 * Visual style settings for chart appearance including theme, date/time formats, and display options.
 */
export function AppearanceSection({ prefs, setPrefs }: ChartSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visual Style</CardTitle>
          <CardDescription>Control colors, language, and display preferences for your charts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="appearance-theme">Theme</Label>
              <p className="text-sm text-muted-foreground">Select the visual theme for chart rendering.</p>
              <Select value={prefs.theme} onValueChange={(val) => setPrefs((p) => ({ ...p, theme: val }))}>
                <SelectTrigger id="appearance-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_THEMES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace(/-/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appearance-date-format">Date Format</Label>
              <p className="text-sm text-muted-foreground">How dates are displayed throughout the application.</p>
              <Select
                value={prefs.date_format}
                onValueChange={(val) => setPrefs((p) => ({ ...p, date_format: val as 'US' | 'EU' | 'ISO' }))}
              >
                <SelectTrigger id="appearance-date-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EU">European (DD/MM/YYYY)</SelectItem>
                  <SelectItem value="US">American (MM/DD/YYYY)</SelectItem>
                  <SelectItem value="ISO">ISO (YYYY-MM-DD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appearance-time-format">Time Format</Label>
              <p className="text-sm text-muted-foreground">How times are displayed throughout the application.</p>
              <Select
                value={prefs.time_format}
                onValueChange={(val) => setPrefs((p) => ({ ...p, time_format: val as '12h' | '24h' }))}
              >
                <SelectTrigger id="appearance-time-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hour (14:30)</SelectItem>
                  <SelectItem value="12h">12 Hour (2:30 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="appearance-degree-indicators" className="text-base">Show Degree Indicators</Label>
              <p className="text-sm text-muted-foreground">
                Display radial lines and degree numbers for planet positions on the chart wheel.
              </p>
            </div>
            <Switch
              id="appearance-degree-indicators"
              checked={prefs.show_degree_indicators}
              onCheckedChange={(checked) => setPrefs((p) => ({ ...p, show_degree_indicators: checked }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="appearance-aspect-icons" className="text-base">Show Aspect Icons</Label>
              <p className="text-sm text-muted-foreground">
                Display aspect symbols (conjunction, square, trine, etc.) on aspect lines.
              </p>
            </div>
            <Switch
              id="appearance-aspect-icons"
              checked={prefs.show_aspect_icons}
              onCheckedChange={(checked) => setPrefs((p) => ({ ...p, show_aspect_icons: checked }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
