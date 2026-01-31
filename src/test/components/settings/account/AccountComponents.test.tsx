/**
 * Unit Tests for Account Settings Sub-components
 *
 * Tests the extracted components from AccountSettingsPanel:
 * - SubscriptionCard
 * - EmailChangeDialog
 * - PasswordChangeDialog
 * - PendingEmailBanner
 *
 * @module src/components/settings/account
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

// ============================================================================
// Mocks - Must be defined before importing the component
// ============================================================================

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

// Mock email actions
const mockRequestEmailChange = vi.fn()
const mockCancelPendingEmailChange = vi.fn()
vi.mock('@/actions/email', () => ({
  requestEmailChange: (email: string) => mockRequestEmailChange(email),
  cancelPendingEmailChange: () => mockCancelPendingEmailChange(),
}))

// Mock auth actions
const mockChangePassword = vi.fn()
const mockCreatePassword = vi.fn()
vi.mock('@/actions/auth', () => ({
  changePassword: (current: string, newPass: string) => mockChangePassword(current, newPass),
  createPassword: (password: string) => mockCreatePassword(password),
}))

// Mock sonner toast
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mockToastSuccess(msg),
    error: (msg: string) => mockToastError(msg),
  },
}))

// Mock fetch for SubscriptionCard
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window.open for subscription management
const mockWindowOpen = vi.fn()
global.window.open = mockWindowOpen

// Import the components after mocks are set up
import { SubscriptionCard } from '@/components/settings/account/SubscriptionCard'
import { EmailChangeDialog } from '@/components/settings/account/EmailChangeDialog'
import { PasswordChangeDialog } from '@/components/settings/account/PasswordChangeDialog'
import { PendingEmailBanner } from '@/components/settings/account/PendingEmailBanner'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wrapper component providing necessary context
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

// ============================================================================
// SubscriptionCard Tests
// ============================================================================

describe('SubscriptionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should show loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { container } = render(
      <TestWrapper>
        <SubscriptionCard />
      </TestWrapper>,
    )

    // Should show loading spinner (Loader2 component with animate-spin class)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('should display free plan badge for free users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plan: 'free', isActive: true, trialDaysLeft: null }),
    })

    render(
      <TestWrapper>
        <SubscriptionCard />
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument()
    })
    expect(screen.getByText('Subscription')).toBeInTheDocument()
  })

  it('should display pro plan badge with manage button', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plan: 'pro', isActive: true, trialDaysLeft: null }),
    })

    render(
      <TestWrapper>
        <SubscriptionCard />
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Pro')).toBeInTheDocument()
    })
    expect(screen.getByText('Manage')).toBeInTheDocument()
  })

  it('should display trial badge with days remaining', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plan: 'trial', isActive: true, trialDaysLeft: 7 }),
    })

    render(
      <TestWrapper>
        <SubscriptionCard />
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Trial PRO')).toBeInTheDocument()
    })
    expect(screen.getByText('7 days left')).toBeInTheDocument()
  })

  it('should display lifetime badge', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ plan: 'lifetime', isActive: true, trialDaysLeft: null }),
    })

    render(
      <TestWrapper>
        <SubscriptionCard />
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Lifetime')).toBeInTheDocument()
    })
  })

  it('should open dodo portal when clicking manage button', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plan: 'pro', isActive: true, trialDaysLeft: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: 'https://portal.dodopayments.com/test' }),
      })

    render(
      <TestWrapper>
        <SubscriptionCard />
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Manage')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Manage'))

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith('https://portal.dodopayments.com/test', '_blank')
    })
  })
})

// ============================================================================
// EmailChangeDialog Tests
// ============================================================================

describe('EmailChangeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render the trigger button', () => {
    render(<EmailChangeDialog currentEmail="test@example.com" onSuccess={vi.fn()} />)

    expect(screen.getByText('Change Email')).toBeInTheDocument()
  })

  it('should open dialog when clicking trigger button', async () => {
    render(<EmailChangeDialog currentEmail="test@example.com" onSuccess={vi.fn()} />)

    fireEvent.click(screen.getByText('Change Email'))

    await waitFor(() => {
      expect(screen.getByText('Change Email Address')).toBeInTheDocument()
    })
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should show current email in dialog', async () => {
    render(<EmailChangeDialog currentEmail="current@example.com" onSuccess={vi.fn()} />)

    fireEvent.click(screen.getByText('Change Email'))

    await waitFor(() => {
      expect(screen.getByText('current@example.com')).toBeInTheDocument()
    })
  })

  it('should submit email change request successfully', async () => {
    const onSuccess = vi.fn()
    mockRequestEmailChange.mockResolvedValueOnce({ success: true })

    render(<EmailChangeDialog currentEmail="test@example.com" onSuccess={onSuccess} />)

    fireEvent.click(screen.getByText('Change Email'))

    await waitFor(() => {
      expect(screen.getByLabelText('New Email Address')).toBeInTheDocument()
    })

    const input = screen.getByLabelText('New Email Address')
    fireEvent.change(input, { target: { value: 'new@example.com' } })

    fireEvent.click(screen.getByText('Send Verification'))

    await waitFor(() => {
      expect(mockRequestEmailChange).toHaveBeenCalledWith('new@example.com')
      expect(mockToastSuccess).toHaveBeenCalledWith('Verification email sent! Please check your inbox.')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('should display error message on failure', async () => {
    mockRequestEmailChange.mockResolvedValueOnce({ error: 'Email already in use' })

    render(<EmailChangeDialog currentEmail="test@example.com" onSuccess={vi.fn()} />)

    fireEvent.click(screen.getByText('Change Email'))

    await waitFor(() => {
      expect(screen.getByLabelText('New Email Address')).toBeInTheDocument()
    })

    const input = screen.getByLabelText('New Email Address')
    fireEvent.change(input, { target: { value: 'taken@example.com' } })

    fireEvent.click(screen.getByText('Send Verification'))

    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// PasswordChangeDialog Tests
// ============================================================================

describe('PasswordChangeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should show "Change Password" button when user has password', () => {
    render(<PasswordChangeDialog hasPassword={true} />)

    expect(screen.getByText('Change Password')).toBeInTheDocument()
  })

  it('should show "Create Password" button when user has no password', () => {
    render(<PasswordChangeDialog hasPassword={false} />)

    expect(screen.getByText('Create Password')).toBeInTheDocument()
  })

  it('should open dialog with correct title for password change', async () => {
    render(<PasswordChangeDialog hasPassword={true} />)

    fireEvent.click(screen.getByText('Change Password'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    // Dialog title
    expect(screen.getAllByText('Change Password').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument()
  })

  it('should open dialog without current password field for create mode', async () => {
    render(<PasswordChangeDialog hasPassword={false} />)

    fireEvent.click(screen.getByText('Create Password'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Current Password')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('should show error when passwords do not match', async () => {
    render(<PasswordChangeDialog hasPassword={false} />)

    fireEvent.click(screen.getByText('Create Password'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'different123' } })

    // Submit form
    const submitButtons = screen.getAllByText('Create Password')
    const submitButton = submitButtons.find((btn) => btn.getAttribute('type') === 'submit')
    if (submitButton) {
      fireEvent.click(submitButton)
    }

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    })
  })

  it('should show error when password is too short', async () => {
    render(<PasswordChangeDialog hasPassword={false} />)

    fireEvent.click(screen.getByText('Create Password'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'short' } })

    // Submit form
    const submitButtons = screen.getAllByText('Create Password')
    const submitButton = submitButtons.find((btn) => btn.getAttribute('type') === 'submit')
    if (submitButton) {
      fireEvent.click(submitButton)
    }

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    })
  })

  it('should create password successfully', async () => {
    mockCreatePassword.mockResolvedValueOnce({ success: true })

    render(<PasswordChangeDialog hasPassword={false} />)

    fireEvent.click(screen.getByText('Create Password'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'validPassword123!' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'validPassword123!' } })

    // Submit form
    const submitButtons = screen.getAllByText('Create Password')
    const submitButton = submitButtons.find((btn) => btn.getAttribute('type') === 'submit')
    if (submitButton) {
      fireEvent.click(submitButton)
    }

    await waitFor(() => {
      expect(mockCreatePassword).toHaveBeenCalledWith('validPassword123!')
      expect(mockToastSuccess).toHaveBeenCalledWith('Password created successfully!')
    })
  })

  it('should change password successfully', async () => {
    mockChangePassword.mockResolvedValueOnce({ success: true })

    render(<PasswordChangeDialog hasPassword={true} />)

    fireEvent.click(screen.getByText('Change Password'))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'oldPassword123!' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newPassword123!' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'newPassword123!' } })

    // Submit form - find the submit button
    const submitButtons = screen.getAllByText('Change Password')
    const submitButton = submitButtons.find((btn) => btn.getAttribute('type') === 'submit')
    if (submitButton) {
      fireEvent.click(submitButton)
    }

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('oldPassword123!', 'newPassword123!')
      expect(mockToastSuccess).toHaveBeenCalledWith('Password changed successfully!')
    })
  })
})

// ============================================================================
// PendingEmailBanner Tests
// ============================================================================

describe('PendingEmailBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should display pending email address', () => {
    render(<PendingEmailBanner pendingEmail="new@example.com" onCancel={vi.fn()} />)

    expect(screen.getByText('Email change pending verification')).toBeInTheDocument()
    expect(screen.getByText('new@example.com')).toBeInTheDocument()
  })

  it('should call onCancel when cancelling email change', async () => {
    const onCancel = vi.fn()
    mockCancelPendingEmailChange.mockResolvedValueOnce({ success: true })

    render(<PendingEmailBanner pendingEmail="new@example.com" onCancel={onCancel} />)

    const cancelButton = screen.getByRole('button')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockCancelPendingEmailChange).toHaveBeenCalled()
      expect(mockToastSuccess).toHaveBeenCalledWith('Email change cancelled.')
      expect(onCancel).toHaveBeenCalled()
    })
  })

  it('should show error toast when cancel fails', async () => {
    mockCancelPendingEmailChange.mockResolvedValueOnce({ success: false, error: 'Failed to cancel' })

    render(<PendingEmailBanner pendingEmail="new@example.com" onCancel={vi.fn()} />)

    const cancelButton = screen.getByRole('button')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to cancel')
    })
  })
})
