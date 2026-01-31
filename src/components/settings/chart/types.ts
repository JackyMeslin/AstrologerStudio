import { type ChartPreferencesData } from '@/actions/preferences'

/**
 * Common props interface shared by all chart settings section components.
 */
export interface ChartSettingsSectionProps {
  prefs: ChartPreferencesData
  setPrefs: React.Dispatch<React.SetStateAction<ChartPreferencesData>>
}
