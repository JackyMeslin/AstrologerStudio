/**
 * Chart Colors Configuration
 *
 * Centralized configuration for all chart colors used throughout the application.
 * This allows easy customization and ensures consistency across components.
 *
 * @module lib/config/chart-colors
 */

import type { PlanetColors, PlanetKey } from '@/types/ephemeris-view'

// ============================================================================
// Planet/Celestial Body Colors
// ============================================================================

/**
 * Default colors for all celestial bodies and points.
 * Used in ephemeris charts, transit views, and other astrological visualizations.
 *
 * Colors are organized by category for easy maintenance.
 * Each planet has both stroke and fill colors (typically the same).
 */
export const PLANET_COLORS: PlanetColors = {
  // Core planets
  Sun: { stroke: '#f59e0b', fill: '#f59e0b' },
  Moon: { stroke: '#6b7280', fill: '#6b7280' },
  Mercury: { stroke: '#3b82f6', fill: '#3b82f6' },
  Venus: { stroke: '#ec4899', fill: '#ec4899' },
  Mars: { stroke: '#ef4444', fill: '#ef4444' },
  Jupiter: { stroke: '#8b5cf6', fill: '#8b5cf6' },
  Saturn: { stroke: '#eab308', fill: '#eab308' },
  Uranus: { stroke: '#06b6d4', fill: '#06b6d4' },
  Neptune: { stroke: '#60a5fa', fill: '#60a5fa' },
  Pluto: { stroke: '#10b981', fill: '#10b981' },
  // Lunar nodes
  Mean_North_Lunar_Node: { stroke: '#c084fc', fill: '#c084fc' },
  True_North_Lunar_Node: { stroke: '#a855f7', fill: '#a855f7' },
  Mean_South_Lunar_Node: { stroke: '#9333ea', fill: '#9333ea' },
  True_South_Lunar_Node: { stroke: '#7c3aed', fill: '#7c3aed' },
  // Centaurs & minor bodies
  Chiron: { stroke: '#22c55e', fill: '#22c55e' },
  Pholus: { stroke: '#16a34a', fill: '#16a34a' },
  // Lilith
  Mean_Lilith: { stroke: '#475569', fill: '#475569' },
  True_Lilith: { stroke: '#64748b', fill: '#64748b' },
  // Earth
  Earth: { stroke: '#059669', fill: '#059669' },
  // Asteroids
  Ceres: { stroke: '#84cc16', fill: '#84cc16' },
  Pallas: { stroke: '#a3e635', fill: '#a3e635' },
  Juno: { stroke: '#bef264', fill: '#bef264' },
  Vesta: { stroke: '#d9f99d', fill: '#d9f99d' },
  // Dwarf planets
  Eris: { stroke: '#f43f5e', fill: '#f43f5e' },
  Sedna: { stroke: '#e11d48', fill: '#e11d48' },
  Haumea: { stroke: '#be185d', fill: '#be185d' },
  Makemake: { stroke: '#db2777', fill: '#db2777' },
  Ixion: { stroke: '#ec4899', fill: '#ec4899' },
  Orcus: { stroke: '#f472b6', fill: '#f472b6' },
  Quaoar: { stroke: '#f9a8d4', fill: '#f9a8d4' },
  // Fixed stars
  Regulus: { stroke: '#fbbf24', fill: '#fbbf24' },
  Spica: { stroke: '#fcd34d', fill: '#fcd34d' },
  // Axes
  Ascendant: { stroke: '#f97316', fill: '#f97316' },
  Medium_Coeli: { stroke: '#facc15', fill: '#facc15' },
  Descendant: { stroke: '#fb923c', fill: '#fb923c' },
  Imum_Coeli: { stroke: '#fde047', fill: '#fde047' },
  // Special points
  Vertex: { stroke: '#14b8a6', fill: '#14b8a6' },
  Anti_Vertex: { stroke: '#2dd4bf', fill: '#2dd4bf' },
  // Arabic parts
  Pars_Fortunae: { stroke: '#0ea5e9', fill: '#0ea5e9' },
  Pars_Spiritus: { stroke: '#38bdf8', fill: '#38bdf8' },
  Pars_Amoris: { stroke: '#7dd3fc', fill: '#7dd3fc' },
  Pars_Fidei: { stroke: '#bae6fd', fill: '#bae6fd' },
}

/**
 * Get color for a specific planet/point.
 * Provides a type-safe way to access planet colors.
 */
export function getPlanetColor(planet: PlanetKey): { stroke: string; fill: string } {
  return PLANET_COLORS[planet]
}

// ============================================================================
// Admin Dashboard Chart Colors
// ============================================================================

/**
 * Color palette for admin dashboard charts (pie, bar, etc.).
 * Used for chart type distributions, user statistics, and other admin visualizations.
 */
export const ADMIN_CHART_COLORS = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#84cc16', // lime
] as const

export type AdminChartColor = (typeof ADMIN_CHART_COLORS)[number]

/**
 * Get color at index with wraparound for indices beyond array length.
 */
export function getAdminChartColor(index: number): AdminChartColor {
  return ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length] as AdminChartColor
}

// ============================================================================
// Time Period Comparison Colors
// ============================================================================

/**
 * Colors for time period comparison charts (today, week, month).
 * Used in admin usage comparison visualizations.
 */
export const TIME_PERIOD_COLORS = {
  today: '#3b82f6', // blue
  week: '#06b6d4', // cyan
  month: '#f59e0b', // amber
} as const

export type TimePeriodKey = keyof typeof TIME_PERIOD_COLORS

/**
 * Get color for a specific time period.
 */
export function getTimePeriodColor(period: TimePeriodKey): string {
  return TIME_PERIOD_COLORS[period]
}
