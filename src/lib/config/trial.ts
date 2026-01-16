/**
 * Trial Configuration
 *
 * Centralized configuration for the trial period system.
 * New users automatically get a PRO trial for the configured duration.
 *
 * @module lib/config/trial
 */

/**
 * Default trial duration in days (used if env var not set)
 */
const DEFAULT_TRIAL_DURATION_DAYS = 15

/**
 * Get the configured trial duration in days
 * Uses TRIAL_DURATION_DAYS environment variable, defaults to 15
 */
export function getTrialDurationDays(): number {
  const envValue = process.env.TRIAL_DURATION_DAYS
  if (envValue) {
    const parsed = parseInt(envValue, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return DEFAULT_TRIAL_DURATION_DAYS
}

/**
 * Get the trial duration in milliseconds
 */
export function getTrialDurationMs(): number {
  return getTrialDurationDays() * 24 * 60 * 60 * 1000
}

/**
 * Calculate trial end date from a given start date
 * @param startDate - The start date (defaults to now)
 */
export function calculateTrialEndDate(startDate: Date = new Date()): Date {
  return new Date(startDate.getTime() + getTrialDurationMs())
}

/**
 * Calculate days left in trial from a given end date
 * @param trialEndDate - The trial end date
 * @returns Number of days left (0 if expired, null if no trial)
 */
export function calculateTrialDaysLeft(trialEndDate: Date | null | undefined): number | null {
  if (!trialEndDate) return null

  const now = new Date()
  const endDate = new Date(trialEndDate)
  const diffMs = endDate.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Check if a trial has expired
 * @param trialEndDate - The trial end date
 */
export function isTrialExpired(trialEndDate: Date | null | undefined): boolean {
  if (!trialEndDate) return true
  return new Date() > new Date(trialEndDate)
}

/**
 * Trial configuration object for use in components
 */
export const TRIAL_CONFIG = {
  get durationDays() {
    return getTrialDurationDays()
  },
  get durationMs() {
    return getTrialDurationMs()
  },
} as const
