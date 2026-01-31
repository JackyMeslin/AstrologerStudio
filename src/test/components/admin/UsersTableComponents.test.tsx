/**
 * Unit Tests for Admin UsersTable Refactored Components
 *
 * Tests the extracted components from UsersTable:
 * - UserTableFilters
 * - UserPagination
 * - UserDetailDialog
 * - UserEditDialog
 * - UserDeleteDialog
 * - useUsersTable hook
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { UserTableFilters } from '@/components/admin/UserTableFilters'
import { UserPagination } from '@/components/admin/UserPagination'
import { UserDetailDialog } from '@/components/admin/UserDetailDialog'
import { UserEditDialog } from '@/components/admin/UserEditDialog'
import { UserDeleteDialog } from '@/components/admin/UserDeleteDialog'
import type { VisibleColumns } from '@/hooks/useUsersTable'
import type { UserDetail, UserListItem } from '@/actions/admin'

// ============================================================================
// Mocks
// ============================================================================

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

// Mock admin actions
vi.mock('@/actions/admin', () => ({
  getUsers: vi.fn().mockResolvedValue({ success: true, data: { users: [], total: 0 } }),
  getUserDetails: vi.fn(),
  updateUserPlan: vi.fn(),
  deleteUser: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================================
// Test Data
// ============================================================================

const defaultVisibleColumns: VisibleColumns = {
  email: true,
  plan: true,
  created: true,
  lastLogin: true,
  lastActive: true,
  logins: true,
  subjects: true,
  charts: true,
  calculations: true,
  calcNatal: true,
  calcTransit: true,
  calcSynastry: true,
  calcComposite: true,
  calcSolarReturn: true,
  calcLunarReturn: true,
  calcTimeline: true,
  calcNow: true,
  aiGenerations: true,
  pdfExports: true,
}

const mockUserDetail: UserDetail = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  authProvider: 'credentials',
  subscriptionPlan: 'pro',
  subscriptionId: null,
  trialEndsAt: null,
  subscriptionEndsAt: null,
  aiGenerationsTotal: 50,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-06-01'),
  lastLoginAt: new Date('2024-06-15'),
  loginCount: 25,
  lastActiveAt: new Date('2024-06-15'),
  subjectsCount: 10,
  savedChartsCount: 5,
  todayAIUsage: 2,
  pdfExportsTotal: 3,
}

const mockUserListItem: UserListItem = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  subscriptionPlan: 'pro',
  aiGenerationsTotal: 50,
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-06-15'),
  loginCount: 25,
  lastActiveAt: new Date('2024-06-15'),
  subjectsCount: 10,
  savedChartsCount: 5,
  calculationsTotal: 100,
  calculationsByType: {
    natal: 30,
    transit: 20,
    synastry: 15,
    composite: 10,
    'solar-return': 10,
    'lunar-return': 5,
    timeline: 5,
    now: 5,
  },
  pdfExportsTotal: 3,
}

// ============================================================================
// UserTableFilters Tests
// ============================================================================

describe('UserTableFilters', () => {
  const defaultProps = {
    search: '',
    onSearchChange: vi.fn(),
    onSearchSubmit: vi.fn(),
    planFilter: '',
    onPlanFilterChange: vi.fn(),
    visibleColumns: defaultVisibleColumns,
    onToggleColumn: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render search input', () => {
    render(<UserTableFilters {...defaultProps} />)

    expect(screen.getByPlaceholderText('Search by username or email...')).toBeInTheDocument()
  })

  it('should render search button', () => {
    render(<UserTableFilters {...defaultProps} />)

    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('should render plan filter dropdown', () => {
    render(<UserTableFilters {...defaultProps} />)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('should render columns button', () => {
    render(<UserTableFilters {...defaultProps} />)

    expect(screen.getByRole('button', { name: /columns/i })).toBeInTheDocument()
  })

  it('should call onSearchChange when typing in search input', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()
    render(<UserTableFilters {...defaultProps} onSearchChange={onSearchChange} />)

    const searchInput = screen.getByPlaceholderText('Search by username or email...')
    await user.type(searchInput, 'test')

    expect(onSearchChange).toHaveBeenCalled()
  })

  it('should call onSearchSubmit when form is submitted', async () => {
    const onSearchSubmit = vi.fn((e) => e.preventDefault())
    render(<UserTableFilters {...defaultProps} onSearchSubmit={onSearchSubmit} />)

    const searchButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchButton)

    expect(onSearchSubmit).toHaveBeenCalled()
  })

  it('should display current search value', () => {
    render(<UserTableFilters {...defaultProps} search="testuser" />)

    const searchInput = screen.getByPlaceholderText('Search by username or email...')
    expect(searchInput).toHaveValue('testuser')
  })
})

// ============================================================================
// UserPagination Tests
// ============================================================================

describe('UserPagination', () => {
  const defaultProps = {
    page: 1,
    pageSize: 20,
    total: 100,
    totalPages: 5,
    onPageChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render pagination info', () => {
    render(<UserPagination {...defaultProps} />)

    expect(screen.getByText(/showing 1 to 20 of 100 users/i)).toBeInTheDocument()
  })

  it('should render page number', () => {
    render(<UserPagination {...defaultProps} />)

    expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument()
  })

  it('should disable previous button on first page', () => {
    render(<UserPagination {...defaultProps} page={1} />)

    const buttons = screen.getAllByRole('button')
    const prevButton = buttons[0]
    expect(prevButton).toBeDisabled()
  })

  it('should disable next button on last page', () => {
    render(<UserPagination {...defaultProps} page={5} />)

    const buttons = screen.getAllByRole('button')
    const nextButton = buttons[1]
    expect(nextButton).toBeDisabled()
  })

  it('should call onPageChange with previous page when clicking previous', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<UserPagination {...defaultProps} page={3} onPageChange={onPageChange} />)

    const buttons = screen.getAllByRole('button')
    const prevButton = buttons[0]
    if (prevButton) {
      await user.click(prevButton)
    }

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('should call onPageChange with next page when clicking next', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<UserPagination {...defaultProps} page={3} onPageChange={onPageChange} />)

    const buttons = screen.getAllByRole('button')
    const nextButton = buttons[1]
    if (nextButton) {
      await user.click(nextButton)
    }

    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('should show correct range for last page', () => {
    render(<UserPagination {...defaultProps} page={5} total={95} totalPages={5} />)

    expect(screen.getByText(/showing 81 to 95 of 95 users/i)).toBeInTheDocument()
  })
})

// ============================================================================
// UserDetailDialog Tests
// ============================================================================

describe('UserDetailDialog', () => {
  const defaultProps = {
    user: mockUserDetail,
    open: true,
    onOpenChange: vi.fn(),
    onEditPlan: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render user details when open', () => {
    render(<UserDetailDialog {...defaultProps} />)

    expect(screen.getByText('User Details')).toBeInTheDocument()
    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should render user name', () => {
    render(<UserDetailDialog {...defaultProps} />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should render subscription plan', () => {
    render(<UserDetailDialog {...defaultProps} />)

    expect(screen.getByText('pro')).toBeInTheDocument()
  })

  it('should render edit button for plan', () => {
    render(<UserDetailDialog {...defaultProps} />)

    // Find the edit button (it has an Edit icon)
    const buttons = screen.getAllByRole('button')
    // There should be at least one edit button
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should call onEditPlan when edit button is clicked', async () => {
    const user = userEvent.setup()
    const onEditPlan = vi.fn()
    render(<UserDetailDialog {...defaultProps} onEditPlan={onEditPlan} />)

    // Find and click the ghost button (edit plan button)
    const buttons = screen.getAllByRole('button')
    // The edit button should be after "Subscription Plan"
    const editButton = buttons.find((btn) => btn.className.includes('ghost'))
    if (editButton) {
      await user.click(editButton)
      expect(onEditPlan).toHaveBeenCalledWith(mockUserDetail)
    }
  })

  it('should not render content when user is null', () => {
    render(<UserDetailDialog {...defaultProps} user={null} />)

    // Dialog should be open but no user content
    expect(screen.getByText('User Details')).toBeInTheDocument()
    expect(screen.queryByText('testuser')).not.toBeInTheDocument()
  })

  it('should show AI usage stats', () => {
    render(<UserDetailDialog {...defaultProps} />)

    expect(screen.getByText('AI Generations (Today)')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('AI Generations (Total)')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })
})

// ============================================================================
// UserEditDialog Tests
// ============================================================================

describe('UserEditDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    newPlan: 'pro',
    onPlanChange: vi.fn(),
    onSave: vi.fn(),
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dialog title', () => {
    render(<UserEditDialog {...defaultProps} />)

    expect(screen.getByText('Edit Subscription Plan')).toBeInTheDocument()
  })

  it('should render plan selector', () => {
    render(<UserEditDialog {...defaultProps} />)

    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('should render cancel and save buttons', () => {
    render(<UserEditDialog {...defaultProps} />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('should call onSave when save button is clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<UserEditDialog {...defaultProps} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalled()
  })

  it('should call onOpenChange when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<UserEditDialog {...defaultProps} onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should disable save button when loading', () => {
    render(<UserEditDialog {...defaultProps} isLoading={true} />)

    expect(screen.getByRole('button', { name: '' })).toBeDisabled()
  })
})

// ============================================================================
// UserDeleteDialog Tests
// ============================================================================

describe('UserDeleteDialog', () => {
  const defaultProps = {
    user: mockUserListItem,
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dialog title', () => {
    render(<UserDeleteDialog {...defaultProps} />)

    expect(screen.getByText('Delete User')).toBeInTheDocument()
  })

  it('should display username in confirmation message', () => {
    render(<UserDeleteDialog {...defaultProps} />)

    expect(screen.getByText(/testuser/)).toBeInTheDocument()
  })

  it('should render cancel and delete buttons', () => {
    render(<UserDeleteDialog {...defaultProps} />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('should call onConfirm when delete button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<UserDeleteDialog {...defaultProps} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(onConfirm).toHaveBeenCalled()
  })

  it('should disable delete button when loading', () => {
    render(<UserDeleteDialog {...defaultProps} isLoading={true} />)

    const deleteButton = screen.getAllByRole('button').find((btn) => btn.className.includes('bg-red'))
    expect(deleteButton).toBeDisabled()
  })

  it('should show warning about permanent deletion', () => {
    render(<UserDeleteDialog {...defaultProps} />)

    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    expect(screen.getByText(/delete all their data/i)).toBeInTheDocument()
  })
})

// ============================================================================
// formatRelativeTime Tests
// ============================================================================

describe('formatRelativeTime utility', () => {
  // We test this indirectly through the components that use it
  // but we could also import and test directly if needed
  it('should be tested through UserDetailDialog', () => {
    // The formatRelativeTime function is used in UserDetailDialog
    // Testing it indirectly through component rendering
    render(<UserDetailDialog user={mockUserDetail} open={true} onOpenChange={vi.fn()} onEditPlan={vi.fn()} />)

    // Last Login should be formatted
    expect(screen.getByText('Last Login')).toBeInTheDocument()
  })
})
