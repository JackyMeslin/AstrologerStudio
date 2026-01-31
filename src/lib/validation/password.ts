/**
 * Centralized password validation
 *
 * Single source of truth for password requirements.
 * Used by server actions (reset, change, create password)
 * and can be imported by frontend for real-time validation.
 */

/** Minimum password length requirement */
export const MIN_PASSWORD_LENGTH = 8

export const PASSWORD_REGEX = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{${MIN_PASSWORD_LENGTH},}$`,
)

export const PASSWORD_ERROR_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters and include uppercase, lowercase, number, and special character.`

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!PASSWORD_REGEX.test(password)) {
    return { valid: false, error: PASSWORD_ERROR_MESSAGE }
  }
  return { valid: true }
}
