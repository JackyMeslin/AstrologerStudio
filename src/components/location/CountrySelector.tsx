'use client'

import { useMemo, useState } from 'react'
import { ChevronsUpDownIcon, CheckIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { COUNTRY_OPTIONS } from '@/lib/geo/countries'
import { cn } from '@/lib/utils/cn'

export interface CountrySelectorProps {
  id: string
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
  errorMessage?: string
}

export function CountrySelector({ id, value, onChange, disabled = false, errorMessage }: CountrySelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredCountries = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRY_OPTIONS
    return COUNTRY_OPTIONS.filter(({ code, name }) => code.toLowerCase().includes(q) || name.toLowerCase().includes(q))
  }, [query])

  const selectedCountry = COUNTRY_OPTIONS.find((c) => c.code === value)

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium" htmlFor={id}>
        Nation
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between h-10" disabled={disabled} id={id}>
            {selectedCountry ? `${selectedCountry.code} — ${selectedCountry.name}` : 'Select nation'}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-[320px]">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search nation..." value={query} onValueChange={setQuery} className="h-10" />
            <CommandList>
              <CommandEmpty>No nation found.</CommandEmpty>
              <CommandGroup>
                {filteredCountries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    onSelect={() => {
                      onChange(country.code)
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    <CheckIcon className={cn('mr-2 h-4 w-4', value === country.code ? 'opacity-100' : 'opacity-0')} />
                    {country.code} — {country.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {errorMessage && <span className="text-xs text-destructive">{errorMessage}</span>}
    </div>
  )
}
