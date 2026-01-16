'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Loader2, PartyPopper } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { dismissTrialWelcome } from '@/actions/trial'

interface TrialWelcomeModalProps {
  isOpen: boolean
  trialDaysLeft: number
  trialDurationDays: number
}

/**
 * Welcome modal shown to ALL users when they start their PRO trial.
 * Displayed once per user (tracked via trialWelcomeShownAt).
 */
export function TrialWelcomeModal({ isOpen, trialDaysLeft, trialDurationDays }: TrialWelcomeModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDismiss = () => {
    setError(null)
    startTransition(async () => {
      const result = await dismissTrialWelcome()
      if (result.error) {
        setError(result.error)
      }
      // On success, the page will revalidate and modal will close
    })
  }

  if (!isOpen) return null

  return (
    <Dialog open={true}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <PartyPopper className="h-8 w-8 text-purple-500" />
          </div>
          <DialogTitle className="text-center text-xl">Welcome to PRO!</DialogTitle>
          <DialogDescription className="text-center">
            You have <strong>{trialDaysLeft} days</strong> of free PRO access to explore all premium features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="mb-2 flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              What&apos;s included:
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Unlimited birth charts</li>
              <li>• All chart types (Transit, Synastry, Composite, Returns)</li>
              <li>• AI-powered interpretations</li>
              <li>• PDF export</li>
              <li>• Timeline analysis</li>
            </ul>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            No credit card required. After {trialDurationDays} days, you can choose to upgrade or continue with the free
            plan.
          </p>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleDismiss}
            disabled={isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Start Exploring'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
