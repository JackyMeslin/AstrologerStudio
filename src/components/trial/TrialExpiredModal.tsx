'use client'

import { useState, useTransition, useEffect } from 'react'
import { Clock, Crown, Loader2, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { downgradeToFree } from '@/actions/trial'
import { isDodoPaymentsEnabled } from '@/lib/subscription/config'
import { dodoPaymentsConfig } from '@/dodopayments/lib/config'
import { clientLogger } from '@/lib/logging/client'

interface TrialExpiredModalProps {
  isOpen: boolean
  userId: string
  userEmail?: string
}

/**
 * Modal shown when a user's trial period has expired.
 * Offers the choice to:
 * 1. Continue with FREE plan (limited features)
 * 2. Upgrade to PRO plan (if DodoPayments is enabled)
 */
export function TrialExpiredModal({ isOpen, userId, userEmail }: TrialExpiredModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [isCheckoutReady, setIsCheckoutReady] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const dodoEnabled = isDodoPaymentsEnabled()

  // Initialize Dodo checkout SDK
  useEffect(() => {
    if (!dodoEnabled || !isOpen) {
      setIsCheckoutReady(true)
      return
    }

    const initCheckout = async () => {
      try {
        const { DodoPayments } = await import('dodopayments-checkout')
        DodoPayments.Initialize({
          mode: dodoPaymentsConfig.mode,
          displayType: 'overlay',
          onEvent: (event: { event_type: string }) => {
            if (event.event_type === 'checkout.closed' || event.event_type === 'checkout.error') {
              setIsCheckoutLoading(false)
              setIsCheckoutOpen(false) // Show the modal again
            }
          },
        })
        setIsCheckoutReady(true)
      } catch (err) {
        clientLogger.error('Failed to initialize checkout:', err)
        setIsCheckoutReady(true)
      }
    }
    initCheckout()
  }, [dodoEnabled, isOpen])

  const handleDowngradeToFree = () => {
    setError(null)
    startTransition(async () => {
      const result = await downgradeToFree()
      if (result.error) {
        setError(result.error)
      }
      // On success, the page will revalidate and modal will close
    })
  }

  const handleUpgradeToPro = async () => {
    setError(null)
    setIsCheckoutLoading(true)

    try {
      // Create checkout session via API
      const response = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: dodoPaymentsConfig.productId,
          userId,
          email: userEmail,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { checkoutUrl } = await response.json()

      if (!checkoutUrl) {
        throw new Error('No checkout URL returned')
      }

      // Hide the modal before opening checkout (z-index conflict)
      setIsCheckoutOpen(true)

      // Open overlay checkout
      const { DodoPayments } = await import('dodopayments-checkout')
      await DodoPayments.Checkout.open({ checkoutUrl })
    } catch (err) {
      clientLogger.error('Failed to open checkout:', err)
      setError('Failed to open checkout. Please try again.')
      setIsCheckoutLoading(false)
      setIsCheckoutOpen(false)
    }
  }

  // Don't render if not open, or if checkout overlay is open
  if (!isOpen || isCheckoutOpen) return null

  return (
    <Dialog open={true}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <DialogTitle className="text-center text-xl">Your Trial Has Ended</DialogTitle>
          <DialogDescription className="text-center">
            Your free PRO trial period has expired. Choose how you&apos;d like to continue:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* PRO Plan Option */}
          {dodoEnabled && (
            <div className="rounded-lg border-2 border-purple-500/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                  <Crown className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Continue with PRO</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Keep all premium features: unlimited charts, all chart types, AI interpretations, PDF export, and
                    more.
                  </p>
                  <div className="mt-3">
                    <Button
                      onClick={handleUpgradeToPro}
                      disabled={isCheckoutLoading || !isCheckoutReady || isPending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                    >
                      {isCheckoutLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Upgrade to PRO
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Free Plan Option */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <span className="text-lg">🆓</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Continue with Free</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Limited features: up to 5 subjects, natal charts only, 5 AI interpretations per day.
                </p>
                <div className="mt-3">
                  <Button variant="outline" onClick={handleDowngradeToFree} disabled={isPending} size="sm">
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Continue with Free'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="text-center text-xs text-muted-foreground">
          <p className="w-full">You can upgrade to PRO at any time from your account settings.</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
