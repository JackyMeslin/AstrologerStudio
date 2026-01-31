'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { getUserProfile, updateUserProfile, type UserProfileData } from '@/actions/user'
import { getPendingEmailChange } from '@/actions/email'
import { clientLogger } from '@/lib/logging/client'
import { DeleteAccountDialog } from './DeleteAccountDialog'
import { SubscriptionCard, EmailChangeDialog, PasswordChangeDialog, PendingEmailBanner } from './account'

const profileSchema = z.object({
  firstName: z.string().max(50, 'First name too long').optional(),
  lastName: z.string().max(50, 'Last name too long').optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function AccountSettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<UserProfileData | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  })

  const loadData = useCallback(async () => {
    try {
      const [profileData, pendingData] = await Promise.all([getUserProfile(), getPendingEmailChange()])
      if (profileData) {
        setUser(profileData)
        form.reset({
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
        })
      }
      if (pendingData) {
        setPendingEmail(pendingData.pendingEmail)
      } else {
        setPendingEmail(null)
      }
    } catch (error) {
      clientLogger.error('Failed to load profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function onSubmit(data: ProfileFormValues) {
    setSaving(true)
    try {
      const result = await updateUserProfile(data)
      if (result.success) {
        toast.success('Profile updated successfully')
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      clientLogger.error('Failed to update profile:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>
          <p className="text-muted-foreground">Manage your personal information and account details.</p>
        </div>
      </div>

      {/* NOTE: DODO PAYMENTS - Subscription Section - Prominent at top */}
      <SubscriptionCard />

      {/* Pending Email Change Banner */}
      {pendingEmail && <PendingEmailBanner pendingEmail={pendingEmail} onCancel={loadData} />}

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your account profile details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={user?.username || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2">
                  <Input value={user?.email || 'Not set'} disabled className="bg-muted" />
                  <EmailChangeDialog currentEmail={user?.email || null} onSuccess={loadData} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" {...form.register('firstName')} disabled={saving} />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" {...form.register('lastName')} disabled={saving} />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !form.formState.isDirty}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                {user?.hasPassword
                  ? 'Change your account password.'
                  : 'Create a password to also login with username/password.'}
              </p>
            </div>
            <PasswordChangeDialog hasPassword={user?.hasPassword ?? true} />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions. Proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
            </div>
            <DeleteAccountDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
