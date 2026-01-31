/**
 * Unit Tests for SidebarNav Component
 *
 * Tests the sidebar navigation component that displays navigation items
 * with support for pro features, external links, and subject selection dialogs.
 *
 * @module src/components/SidebarNav
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
    subject: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

// Mock next/navigation
const mockPush = vi.fn()
const mockPathname = vi.fn(() => '/dashboard')
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => mockPathname(),
}))

// Mock subscription hooks
const mockSubscriptionData = vi.fn()
vi.mock('@/lib/subscription/hooks', () => ({
  useSubscription: () => ({
    data: mockSubscriptionData(),
    isLoading: false,
  }),
}))

// Mock subscription config
const mockIsDodoPaymentsEnabled = vi.fn(() => false)
vi.mock('@/lib/subscription/config', () => ({
  isDodoPaymentsEnabled: () => mockIsDodoPaymentsEnabled(),
}))

// Mock useSubjects hook to avoid real API calls
vi.mock('@/hooks/useSubjects', () => ({
  useSubjects: () => ({
    query: {
      data: [
        {
          id: 'test-subject-1',
          name: 'Test Subject',
          birth_datetime: '1990-01-01T12:00:00Z',
          city: 'Rome',
          nation: 'Italy',
          latitude: 41.9028,
          longitude: 12.4964,
          timezone: 'Europe/Rome',
        },
      ],
      isLoading: false,
      error: null,
    },
  }),
}))

// Mock useChartPreferences hook
vi.mock('@/hooks/useChartPreferences', () => ({
  useChartPreferences: () => ({
    dateFormat: 'ISO',
    timeFormat: '24h',
    preferences: {
      theme: 'classic',
      date_format: 'ISO',
      time_format: '24h',
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}))

// Keep backward compatibility mock for deprecated hooks
vi.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => 'ISO',
  useTimeFormat: () => '24h',
}))

// Mock date utils
vi.mock('@/lib/utils/date', () => ({
  formatDisplayDate: (date: string) => date.split('T')[0],
}))

// Mock useIsMobile hook used by SidebarProvider
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

// Mock the sidebar UI components to avoid useSidebar context issues
vi.mock('@/components/ui/sidebar', () => ({
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-content">{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-group">{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group-label">{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-group-content">{children}</div>
  ),
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul data-testid="sidebar-menu">{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li data-testid="sidebar-menu-item">{children}</li>,
  SidebarMenuButton: ({
    children,
    asChild,
    isActive,
    tooltip: _tooltip,
    onClick,
    className,
  }: {
    children: React.ReactNode
    asChild?: boolean
    isActive?: boolean
    tooltip?: string
    onClick?: (e: React.MouseEvent) => void
    className?: string
  }) => {
    // If asChild is true, render children directly with onClick merged
    if (asChild && React.isValidElement(children)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childProps = children.props as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
          onClick?.(e)
          childProps?.onClick?.(e)
        },
        'data-active': isActive,
      })
    }
    return (
      <button data-testid="sidebar-menu-button" data-active={isActive} onClick={onClick} className={className}>
        {children}
      </button>
    )
  },
  SidebarMenuBadge: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode
    className?: string
  } & React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="sidebar-menu-badge" className={className} {...props}>
      {children}
    </div>
  ),
  useSidebar: () => ({
    state: 'expanded',
    open: true,
    setOpen: vi.fn(),
    openMobile: false,
    setOpenMobile: vi.fn(),
    isMobile: false,
    toggleSidebar: vi.fn(),
  }),
}))

// Import the component after mocks are set up
import { SidebarNav, type NavGroup } from '@/components/SidebarNav'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wrapper component providing necessary context for SidebarNav
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('SidebarNav', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue('/dashboard')
    mockSubscriptionData.mockReturnValue({ plan: 'pro', isActive: true })
    mockIsDodoPaymentsEnabled.mockReturnValue(false)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render default navigation groups', () => {
      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      // Check for default group labels
      expect(screen.getByText('Workspace')).toBeInTheDocument()
      expect(screen.getByText('Charts')).toBeInTheDocument()
      expect(screen.getByText('System')).toBeInTheDocument()
    })

    it('should render navigation items within groups', () => {
      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      // Workspace items
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Subjects')).toBeInTheDocument()
      expect(screen.getByText('Ephemeris')).toBeInTheDocument()

      // Charts items
      expect(screen.getByText('Natal Chart')).toBeInTheDocument()
      expect(screen.getByText('Transits')).toBeInTheDocument()
      expect(screen.getByText('Synastry')).toBeInTheDocument()

      // System items
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should accept custom navigation groups', () => {
      const customGroups: NavGroup[] = [
        {
          title: 'Custom Group',
          items: [{ icon: () => <span>Icon</span>, label: 'Custom Item', to: '/custom' }],
        },
      ]

      render(
        <TestWrapper>
          <SidebarNav groups={customGroups} />
        </TestWrapper>,
      )

      expect(screen.getByText('Custom Group')).toBeInTheDocument()
      expect(screen.getByText('Custom Item')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Active State Tests
  // ===========================================================================

  describe('active state', () => {
    it('should mark Home as active when pathname is /dashboard', () => {
      mockPathname.mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      const homeLink = screen.getByRole('link', { name: /home/i })
      expect(homeLink).toHaveAttribute('aria-current', 'page')
    })

    it('should mark Subjects as active when pathname is /subjects', () => {
      mockPathname.mockReturnValue('/subjects')

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      const subjectsLink = screen.getByRole('link', { name: /subjects/i })
      expect(subjectsLink).toHaveAttribute('aria-current', 'page')
    })

    it('should mark Subjects as active on nested routes', () => {
      mockPathname.mockReturnValue('/subjects/123/natal')

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      const subjectsLink = screen.getByRole('link', { name: /subjects/i })
      expect(subjectsLink).toHaveAttribute('aria-current', 'page')
    })

    it('should not mark items with # href as active', () => {
      mockPathname.mockReturnValue('#')

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      // Items with action (like "Natal Chart") should not have aria-current
      const natalItems = screen.getAllByText('Natal Chart')
      natalItems.forEach((item) => {
        // The parent link/button should not be marked active
        expect(item.closest('[aria-current="page"]')).toBeNull()
      })
    })
  })

  // ===========================================================================
  // Pro Feature Tests
  // ===========================================================================

  describe('pro features', () => {
    it('should not show PRO badges when billing is disabled', () => {
      mockIsDodoPaymentsEnabled.mockReturnValue(false)

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      // PRO badges should not appear
      expect(screen.queryByText('PRO')).not.toBeInTheDocument()
    })

    it('should show PRO badges for free users when billing is enabled', () => {
      mockIsDodoPaymentsEnabled.mockReturnValue(true)
      mockSubscriptionData.mockReturnValue({ plan: 'free', isActive: true })

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      // PRO badges should appear for pro-only items
      const proBadges = screen.getAllByText('PRO')
      expect(proBadges.length).toBeGreaterThan(0)
    })

    it('should not show PRO badges for pro users', () => {
      mockIsDodoPaymentsEnabled.mockReturnValue(true)
      mockSubscriptionData.mockReturnValue({ plan: 'pro', isActive: true })

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      expect(screen.queryByText('PRO')).not.toBeInTheDocument()
    })

    it('should not show PRO badges for lifetime users', () => {
      mockIsDodoPaymentsEnabled.mockReturnValue(true)
      mockSubscriptionData.mockReturnValue({ plan: 'lifetime', isActive: true })

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      expect(screen.queryByText('PRO')).not.toBeInTheDocument()
    })

    it('should redirect free users to pricing when clicking pro items', async () => {
      mockIsDodoPaymentsEnabled.mockReturnValue(true)
      mockSubscriptionData.mockReturnValue({ plan: 'free', isActive: true })

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      // Find and click a pro item (Transits)
      const transitsItem = screen.getByText('Transits')
      fireEvent.click(transitsItem)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/pricing')
      })
    })

    it('should apply disabled styles to pro items for free users', () => {
      mockIsDodoPaymentsEnabled.mockReturnValue(true)
      mockSubscriptionData.mockReturnValue({ plan: 'free', isActive: true })

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      // Timeline is a pro item
      const timelineItem = screen.getByText('Timeline')
      // Should have opacity-50 class in parent element
      expect(timelineItem.closest('[class*="opacity-50"]')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Action Dialog Tests
  // Note: These tests are skipped due to cmdk (CommandDialog) requiring
  // scrollIntoView which is not available in jsdom. The dialog functionality
  // can be tested via integration/e2e tests.
  // ===========================================================================

  describe('action dialogs', () => {
    it.skip('should open subject selector dialog when clicking chart action', async () => {
      mockIsDodoPaymentsEnabled.mockReturnValue(false)

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      // Click on Natal Chart which has an action
      const natalChartItem = screen.getByText('Natal Chart')
      fireEvent.click(natalChartItem)

      // Dialog should open - check for dialog content
      await waitFor(() => {
        expect(screen.getByText('Select subject for natal')).toBeInTheDocument()
      })
    })

    it.skip('should close dialog and navigate when subject is selected', async () => {
      mockIsDodoPaymentsEnabled.mockReturnValue(false)

      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      // Open the dialog
      const natalChartItem = screen.getByText('Natal Chart')
      fireEvent.click(natalChartItem)

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByText('Select subject for natal')).toBeInTheDocument()
      })

      // Select a subject
      const subjectOption = screen.getByText('Test Subject')
      fireEvent.click(subjectOption)

      // Should navigate to the subject's chart page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subjects/test-subject-1/natal')
      })
    })
  })

  // ===========================================================================
  // Navigation Tests
  // ===========================================================================

  describe('navigation', () => {
    it('should render links with correct href for non-action items', () => {
      render(
        <TestWrapper>
          <SidebarNav />
        </TestWrapper>,
      )

      const homeLink = screen.getByRole('link', { name: /home/i })
      expect(homeLink).toHaveAttribute('href', '/dashboard')

      const subjectsLink = screen.getByRole('link', { name: /subjects/i })
      expect(subjectsLink).toHaveAttribute('href', '/subjects')

      const settingsLink = screen.getByRole('link', { name: /settings/i })
      expect(settingsLink).toHaveAttribute('href', '/settings')
    })
  })

  // ===========================================================================
  // Badge Tests
  // ===========================================================================

  describe('badges', () => {
    it('should render badge when item has badge property', () => {
      const groupsWithBadge: NavGroup[] = [
        {
          title: 'Test Group',
          items: [
            {
              icon: () => <span>Icon</span>,
              label: 'Item with Badge',
              to: '/test',
              badge: 5,
            },
          ],
        },
      ]

      render(
        <TestWrapper>
          <SidebarNav groups={groupsWithBadge} />
        </TestWrapper>,
      )

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByLabelText('5 items')).toBeInTheDocument()
    })

    it('should render string badges', () => {
      const groupsWithBadge: NavGroup[] = [
        {
          title: 'Test Group',
          items: [
            {
              icon: () => <span>Icon</span>,
              label: 'Item with Badge',
              to: '/test',
              badge: 'New',
            },
          ],
        },
      ]

      render(
        <TestWrapper>
          <SidebarNav groups={groupsWithBadge} />
        </TestWrapper>,
      )

      expect(screen.getByText('New')).toBeInTheDocument()
    })
  })
})
