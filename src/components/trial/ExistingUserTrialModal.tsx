'use client'

import { useState, useTransition } from 'react'
import { Gift, Sparkles, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { activateBonusTrial } from '@/actions/trial'

interface ExistingUserTrialModalProps {
  isOpen: boolean
  trialDurationDays: number
}

/**
 * Modal shown to existing free users to offer them a bonus PRO trial.
 * This is part of the new trial system where all users get a trial period.
 */
export function ExistingUserTrialModal({ isOpen, trialDurationDays }: ExistingUserTrialModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleActivateTrial = () => {
    setError(null)
    startTransition(async () => {
      const result = await activateBonusTrial()
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
            <Gift className="h-8 w-8 text-purple-500" />
          </div>
          <DialogTitle className="text-center text-xl">Special Gift for You!</DialogTitle>
          <DialogDescription className="text-center">
            As a valued member, we&apos;re offering you <strong>{trialDurationDays} days of free PRO access</strong> to
            explore all our premium features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="mb-2 flex items-center gap-2 font-medium">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              What you&apos;ll unlock:
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Unlimited birth charts</li>
              <li>• All chart types (Transit, Synastry, Composite, Returns)</li>
              <li>• AI-powered interpretations</li>
              <li>• PDF export</li>
              <li>• Timeline analysis</li>
            </ul>
          </div>

          <div className="rounded-md bg-green-500/10 border border-green-500/30 p-3 text-center">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium">
              100% Free - No credit card required
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              After {trialDurationDays} days you&apos;ll automatically return to the Free plan.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleActivateTrial}
            disabled={isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Start My Free {trialDurationDays}-Day Trial
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
