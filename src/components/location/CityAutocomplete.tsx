'use client'

import { Loader2 } from 'lucide-react'

export interface CitySuggestion {
  label: string
  value: string
  countryCode?: string
  latitude: number
  longitude: number
}

export interface CityAutocompleteProps {
  id: string
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: CitySuggestion) => void
  suggestions: CitySuggestion[]
  loading: boolean
  error: string | null
  disabled?: boolean
  errorMessage?: string
}

export function CityAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  suggestions,
  loading,
  error,
  disabled = false,
  errorMessage,
}: CityAutocompleteProps) {
  const showDropdown = loading || error || suggestions.length > 0

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium" htmlFor={id}>
        City
      </label>
      <div className="relative">
        <input
          id={id}
          className="border rounded px-2 py-1 text-sm bg-background w-full h-10"
          placeholder="City"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
        {showDropdown && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border/70 bg-background shadow-lg">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Searching...
              </div>
            )}
            {error && <div className="px-3 py-2 text-xs text-destructive border-b border-border/60">{error}</div>}
            {!loading &&
              suggestions.map((option) => (
                <button
                  type="button"
                  key={`${option.value}-${option.latitude}-${option.longitude}`}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted/70 text-sm"
                  onClick={() => onSelect(option)}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    Lat {option.latitude.toFixed(4)}, Lng {option.longitude.toFixed(4)}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
      {errorMessage && <span className="text-xs text-destructive">{errorMessage}</span>}
    </div>
  )
}
