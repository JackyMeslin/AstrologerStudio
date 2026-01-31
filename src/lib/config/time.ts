/**
 * Time Duration Constants
 *
 * Centralized configuration for time durations used across the application.
 * Having these in one place makes it easy to modify durations consistently
 * and provides self-documenting named constants.
 *
 * @module lib/config/time
 */

/**
 * Session duration in milliseconds (7 days)
 *
 * Used for:
 * - JWT session cookie expiration
 * - Session token validity period
 */
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Session duration as a jose-compatible time string
 *
 * Used for:
 * - JWT setExpirationTime() in jose library
 */
export const SESSION_DURATION_STRING = '7d' as const

/**
 * Verification token expiry in milliseconds (24 hours)
 *
 * Used for:
 * - Account verification tokens
 * - Email change verification tokens
 * - Password reset tokens
 */
export const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000

/**
 * Time configuration object for use in components and utilities
 */
export const TIME_CONFIG = {
  /** Session duration in milliseconds (7 days) */
  sessionDurationMs: SESSION_DURATION_MS,
  /** Session duration as jose-compatible string */
  sessionDurationString: SESSION_DURATION_STRING,
  /** Verification token expiry in milliseconds (24 hours) */
  tokenExpiryMs: TOKEN_EXPIRY_MS,
} as const
