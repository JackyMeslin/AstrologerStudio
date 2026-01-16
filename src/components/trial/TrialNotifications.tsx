'use client'

import { ExistingUserTrialModal } from './ExistingUserTrialModal'
import { TrialExpiredModal } from './TrialExpiredModal'
import { TrialWelcomeModal } from './TrialWelcomeModal'

interface TrialStatusData {
  plan: string
  isOnTrial: boolean
  trialDaysLeft: number | null
  needsBonusTrialOffer: boolean
  isTrialExpired: boolean
  needsTrialWelcome: boolean
}

interface TrialNotificationsProps {
  trialStatus: TrialStatusData
  trialDurationDays: number
  userId: string
  userEmail?: string
}

/**
 * Client component that handles all trial-related notifications.
 * Displays:
 * - Trial welcome modal (first time user sees their trial)
 * - Existing user trial modal (when eligible for bonus trial)
 * - Trial expired modal (when trial has ended)
 */
export function TrialNotifications({ trialStatus, trialDurationDays, userId, userEmail }: TrialNotificationsProps) {
  return (
    <>
      {/* Welcome modal for ALL users starting trial (shown once) */}
      <TrialWelcomeModal
        isOpen={trialStatus.needsTrialWelcome}
        trialDaysLeft={trialStatus.trialDaysLeft ?? trialDurationDays}
        trialDurationDays={trialDurationDays}
      />

      {/* Modal for existing FREE users who haven't been offered bonus trial yet */}
      <ExistingUserTrialModal isOpen={trialStatus.needsBonusTrialOffer} trialDurationDays={trialDurationDays} />

      {/* Modal when trial has expired */}
      <TrialExpiredModal isOpen={trialStatus.isTrialExpired} userId={userId} userEmail={userEmail} />
    </>
  )
}
