// Global configuration for AI interpretation behavior

// Enable or disable server-side AI caching for interpretations.
// Env: AI_CACHE_ENABLED = "true" | "false" (default: "true")
const rawCacheEnabled = process.env.AI_CACHE_ENABLED
export const AI_CACHE_ENABLED: boolean = rawCacheEnabled === undefined ? true : rawCacheEnabled.toLowerCase() === 'true'

// Time-to-live for cached AI interpretations in milliseconds.
// Env: AI_CACHE_TTL_MS (number, default: 24h)
const defaultTtlMs = 24 * 60 * 60 * 1000
const rawTtl = process.env.AI_CACHE_TTL_MS

export const AI_CACHE_TTL_MS: number = (() => {
  if (!rawTtl) return defaultTtlMs
  const parsed = Number(rawTtl)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultTtlMs
})()

// Default AI model for interpretations
const DEFAULT_AI_MODEL = 'deepseek/deepseek-v3.2'

// AI model to use for interpretations.
// Env: AI_MODEL (string, default: 'deepseek/deepseek-v3.2')
// Allows switching models per environment without code changes.
export const AI_MODEL = process.env.AI_MODEL || DEFAULT_AI_MODEL
