/**
 * Centralized React Query keys for consistent cache invalidation and updates.
 */

export const queryKeys = {
  subjects: {
    all: ['subjects'] as const,
    list: (count = 50) => ['subjects', { count }] as const,
  },
} as const
