/**
 * Application Configuration
 *
 * Centralized configuration for application-wide constants.
 * This allows easy configuration for different deployment environments.
 *
 * @module lib/config/app
 */

/**
 * Default application URL (used if env var not set)
 */
const DEFAULT_APP_URL = 'https://astrologerstudio.com'

/**
 * The base URL of the application.
 * Uses NEXT_PUBLIC_APP_URL environment variable for custom deployments.
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
