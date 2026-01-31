import { z } from 'zod'
import { rodens_rating } from '@/types/schemas'

// Simple HH:MM:SS (24h) regex
const TIME_REGEX = /^(\d{2}):(\d{2}):(\d{2})$/

/**
 * Schema for birthDate that accepts:
 * - undefined (field not present)
 * - empty string (transforms to undefined)
 * - valid ISO date string (transforms to UTC ISO string)
 */
const birthDateSchema = z
  .union([z.string(), z.undefined()])
  .transform((v): string | undefined => (!v || v === '' ? undefined : v))
  .refine(
    (v) => {
      if (!v) return true
      const d = new Date(v)
      return !isNaN(d.getTime())
    },
    { message: 'Invalid date' },
  )
  .transform((v): string | undefined => {
    if (!v) return undefined
    const d = new Date(v)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString()
  })

/**
 * Schema for birthTime that accepts:
 * - undefined (field not present)
 * - empty string (transforms to undefined)
 * - valid HH:MM:SS string
 */
const birthTimeSchema = z
  .union([z.string(), z.undefined()])
  .transform((v): string | undefined => (!v || v === '' ? undefined : v))
  .refine((v) => {
    if (!v) return true
    if (!TIME_REGEX.test(v)) return false
    const [, hh, mm, ss] = v.match(TIME_REGEX) as string[]
    const h = Number(hh),
      m = Number(mm),
      s = Number(ss)
    return h <= 23 && m <= 59 && s <= 59
  }, 'Invalid time format (HH:MM:SS)')
  .transform((v): string | undefined => {
    if (!v) return undefined
    const parts = v.split(':')
    while (parts.length < 3) parts.push('00')
    const [h, m, s] = parts.map((p) => p.padStart(2, '0'))
    return `${h}:${m}:${s}`
  })

export const updateSubjectSchema = z.object({
  id: z.string().min(1, 'Missing ID'),
  name: z.string().min(1, 'Name is required').max(120, 'Max 120 characters'),
  city: z.string().trim().min(1, 'City is required').max(60, 'Max 60 characters'),
  nation: z.string().trim().min(1, 'Nation is required').max(60, 'Max 60 characters'),
  timezone: z
    .string()
    .min(1, 'Timezone is required')
    .max(80, 'Max 80 characters')
    .regex(/^[A-Za-z0-9_+\-/]+$/, 'Only letters, numbers and timezone symbols'),
  birthDate: birthDateSchema,
  birthTime: birthTimeSchema,
  latitude: z.number().min(-90, 'Min -90').max(90, 'Max 90').optional(),
  longitude: z.number().min(-180, 'Min -180').max(180, 'Max 180').optional(),
  rodens_rating: rodens_rating.nullable().optional(),
  tags: z.array(z.string().trim()).max(10, 'Max 10 tags').nullable().optional(),
  notes: z.string().optional(),
})

export type UpdateSubjectSchema = typeof updateSubjectSchema
/** Type for form inputs before Zod transforms (birthDate/birthTime are always strings) */
export type UpdateSubjectFormInput = z.input<typeof updateSubjectSchema>
/** Type for validated output after Zod transforms (birthDate/birthTime may be undefined) */
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>

export const createSubjectSchema = updateSubjectSchema.omit({ id: true })
export type CreateSubjectSchema = typeof createSubjectSchema
/** Type for form inputs before Zod transforms (birthDate/birthTime are always strings) */
export type CreateSubjectFormInput = z.input<typeof createSubjectSchema>
/** Type for validated output after Zod transforms (birthDate/birthTime may be undefined) */
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>
