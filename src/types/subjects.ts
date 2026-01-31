// Subject domain-related types and helpers
// Keep this file free of runtime code; types and re-exports only.

// Re-export Subject and related zod-derived types
export type { Subject, RodensRating } from './schemas'

// Form input types (re-export from validation schemas)
export type {
  UpdateSubjectFormInput,
  UpdateSubjectInput,
  CreateSubjectFormInput,
  CreateSubjectInput,
} from '@/lib/validation/subject'