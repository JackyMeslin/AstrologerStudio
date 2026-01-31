'use client'

import { useQuery } from '@tanstack/react-query'
import { STALE_TIME } from '@/lib/config/query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, CreditCard, Crown, Infinity as InfinityIcon, Clock } from 'lucide-react'

export function SubscriptionCard() {
  // Use query with forceSync for accurate billing data
  const { data, isLoading } = useQuery({
    queryKey: ['subscription-settings'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/status?forceSync=true')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json() as Promise<{
        plan: string
        isActive: boolean
        trialDaysLeft: number | null
        subscriptionId?: string
        subscriptionEndsAt?: string
      }>
    },
    staleTime: STALE_TIME.NONE, // Always fresh on settings page
  })

  const handleManageSubscription = async () => {
    // Use Dodo Payments API to get personalized customer portal URL
    try {
      const response = await fetch('/api/dodo/portal', { method: 'POST' })
      if (response.ok) {
        const { url } = await response.json()
        window.open(url, '_blank')
      } else {
        // Fallback to generic Dodo dashboard if portal creation fails
        window.open('https://app.dodopayments.com', '_blank')
      }
    } catch {
      window.open('https://app.dodopayments.com', '_blank')
    }
  }

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardContent className="py-2">
          <div className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const plan = data?.plan || 'free'
  const isPaid = plan === 'pro' || plan === 'trial'
  const isLifetime = plan === 'lifetime'
  const isTrial = plan === 'trial'

  // Get badge styling based on plan
  const getBadge = () => {
    switch (plan) {
      case 'lifetime':
        return { variant: 'default' as const, label: 'Lifetime', Icon: InfinityIcon }
      case 'pro':
        return { variant: 'default' as const, label: 'Pro', Icon: Crown }
      case 'trial':
        return { variant: 'outline' as const, label: 'Trial PRO', Icon: Clock }
      default:
        return { variant: 'outline' as const, label: 'Free', Icon: CreditCard }
    }
  }

  const { variant, label, Icon } = getBadge()

  return (
    <Card className="border-2 border-primary/30 bg-primary/5 py-4">
      <CardContent className="py-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(isPaid || isLifetime) && <CheckCircle className="h-5 w-5 text-green-500" />}
            <span className="font-medium">Subscription</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge className="h-8" variant={variant}>
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </Badge>
              {isTrial && data?.trialDaysLeft !== null && data?.trialDaysLeft !== undefined && (
                <span className="text-sm text-muted-foreground">
                  {data.trialDaysLeft} {data.trialDaysLeft === 1 ? 'day' : 'days'} left
                </span>
              )}
            </div>
            {/* Show manage button for paid subscriptions (not trial) */}
            {plan === 'pro' && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                <CreditCard className="mr-2 h-4 w-4" />
                Manage
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
