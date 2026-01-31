import type { ChartResponse, EnrichedSubjectModel } from '@/types/astrology'

/**
 * Constructs a minimal ChartResponse for SynastryChart sub-components.
 * Used to provide data for individual subject cards in dual-wheel planetary return views.
 */
export function getSubChartData(subSubject: EnrichedSubjectModel, activePoints?: string[]): ChartResponse {
  return {
    status: 'OK',
    chart_data: {
      subject: subSubject,
      chart_type: 'Natal',
      aspects: [],
      element_distribution: {
        fire: 0,
        earth: 0,
        air: 0,
        water: 0,
        fire_percentage: 0,
        earth_percentage: 0,
        air_percentage: 0,
        water_percentage: 0,
      },
      quality_distribution: {
        cardinal: 0,
        fixed: 0,
        mutable: 0,
        cardinal_percentage: 0,
        fixed_percentage: 0,
        mutable_percentage: 0,
      },
      active_points: activePoints ?? [],
      active_aspects: [],
      houses_names_list: [],
      lunar_phase: subSubject.lunar_phase ?? {
        degrees_between_s_m: 0,
        moon_phase: 0,
        moon_emoji: '',
        moon_phase_name: '',
      },
    },
  }
}
