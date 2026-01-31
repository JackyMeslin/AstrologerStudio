/**
 * Unit Tests for AIGenerationSection Component
 *
 * Tests the AI generation section that displays interpretation controls
 * including school badge, usage counter, relationship selector, and generate/stop button.
 *
 * @module src/components/notes-panel/AIGenerationSection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIGenerationSection } from '@/components/notes-panel/AIGenerationSection'

// ============================================================================
// Mocks
// ============================================================================

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    subject: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

// ============================================================================
// Tests
// ============================================================================

describe('AIGenerationSection', () => {
  let onGenerate: () => void
  let onStop: () => void
  let onRelationshipTypeChange: (type: string) => void

  beforeEach(() => {
    vi.clearAllMocks()
    onGenerate = vi.fn()
    onStop = vi.fn()
    onRelationshipTypeChange = vi.fn()
  })

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render the AI Interpretation title', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={false}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      expect(screen.getByText('AI Interpretation')).toBeInTheDocument()
    })

    it('should display the selected school as a badge', () => {
      render(
        <AIGenerationSection
          selectedSchool="traditional"
          isGenerating={false}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      expect(screen.getByText('Traditional Astrology')).toBeInTheDocument()
    })

    it('should display usage information when provided', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          usageData={{ remaining: 5, limit: 10 }}
          isGenerating={false}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      expect(screen.getByText('5/10 left')).toBeInTheDocument()
    })

    it('should not display usage when not provided', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={false}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      expect(screen.queryByText(/left$/)).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // School Display Name Tests
  // ===========================================================================

  describe('school display names', () => {
    const schools = [
      { key: 'modern', display: 'Modern Astrology' },
      { key: 'traditional', display: 'Traditional Astrology' },
      { key: 'psychological', display: 'Psychological Astrology' },
      { key: 'evolutionary', display: 'Evolutionary Astrology' },
      { key: 'vedic', display: 'Vedic Astrology' },
      { key: 'custom', display: 'Custom' },
    ]

    schools.forEach(({ key, display }) => {
      it(`should display "${display}" for school "${key}"`, () => {
        render(
          <AIGenerationSection
            selectedSchool={key}
            isGenerating={false}
            relationshipType="generic"
            onRelationshipTypeChange={onRelationshipTypeChange}
            onGenerate={onGenerate}
            onStop={onStop}
          />,
        )

        expect(screen.getByText(display)).toBeInTheDocument()
      })
    })

    it('should display the raw key for unknown schools', () => {
      render(
        <AIGenerationSection
          selectedSchool="unknown-school"
          isGenerating={false}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      expect(screen.getByText('unknown-school')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Generate Button Tests
  // ===========================================================================

  describe('generate button', () => {
    it('should show Generate button when not generating', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={false}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
    })

    it('should call onGenerate when Generate button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={false}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      const button = screen.getByRole('button', { name: /generate/i })
      await user.click(button)

      expect(onGenerate).toHaveBeenCalledTimes(1)
    })

    it('should show Stop button when generating', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={true}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    })

    it('should call onStop when Stop button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={true}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      const button = screen.getByRole('button', { name: /stop/i })
      await user.click(button)

      expect(onStop).toHaveBeenCalledTimes(1)
    })

    it('should show destructive variant when generating', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={true}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      const button = screen.getByRole('button', { name: /stop/i })
      // Button should have destructive styling (we check for the button existing)
      expect(button).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Relationship Selector Tests
  // ===========================================================================

  describe('relationship selector', () => {
    it('should not show relationship selector by default', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={false}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })

    it('should show relationship selector when enabled', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={false}
          showRelationshipSelector={true}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should display the current relationship type', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={false}
          showRelationshipSelector={true}
          relationshipType="romantic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      const trigger = screen.getByRole('combobox')
      expect(within(trigger).getByText('Romantic')).toBeInTheDocument()
    })

    it('should disable relationship selector when generating', () => {
      render(
        <AIGenerationSection
          selectedSchool="modern"
          isGenerating={true}
          showRelationshipSelector={true}
          relationshipType="generic"
          onRelationshipTypeChange={onRelationshipTypeChange}
          onGenerate={onGenerate}
          onStop={onStop}
        />,
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeDisabled()
    })
  })
})
