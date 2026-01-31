'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, CheckCircle, X } from 'lucide-react'
import { cancelPendingEmailChange } from '@/actions/email'

export interface PendingEmailBannerProps {
  pendingEmail: string
  onCancel: () => void
}

export function PendingEmailBanner({ pendingEmail, onCancel }: PendingEmailBannerProps) {
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const result = await cancelPendingEmailChange()
      if (result.success) {
        toast.success('Email change cancelled.')
        onCancel()
      } else {
        toast.error(result.error || 'Failed to cancel.')
      }
    } catch {
      toast.error('An error occurred.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-medium">Email change pending verification</p>
          <p className="text-xs text-muted-foreground">
            Waiting for you to verify: <strong>{pendingEmail}</strong>
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isCancelling}>
        {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      </Button>
    </div>
  )
}
