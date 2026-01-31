'use client'

export interface CoordinatesInputProps {
  idPrefix: string
  latitude: number | undefined
  longitude: number | undefined
  onLatitudeChange: (value: number | undefined) => void
  onLongitudeChange: (value: number | undefined) => void
  disabled?: boolean
  latitudeError?: string
  longitudeError?: string
}

export function CoordinatesInput({
  idPrefix,
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
  disabled = false,
  latitudeError,
  longitudeError,
}: CoordinatesInputProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor={`${idPrefix}_latitude`}>
          Latitude
        </label>
        <input
          id={`${idPrefix}_latitude`}
          type="number"
          step="0.0001"
          min={-90}
          max={90}
          className="border rounded px-2 py-1 text-sm bg-background"
          placeholder="-90 a 90"
          value={latitude ?? ''}
          onChange={(e) => {
            const v = e.target.value
            onLatitudeChange(v === '' ? undefined : Number(v))
          }}
          disabled={disabled}
        />
        {latitudeError && <span className="text-xs text-destructive">{latitudeError}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor={`${idPrefix}_longitude`}>
          Longitude
        </label>
        <input
          id={`${idPrefix}_longitude`}
          type="number"
          step="0.0001"
          min={-180}
          max={180}
          className="border rounded px-2 py-1 text-sm bg-background"
          placeholder="-180 a 180"
          value={longitude ?? ''}
          onChange={(e) => {
            const v = e.target.value
            onLongitudeChange(v === '' ? undefined : Number(v))
          }}
          disabled={disabled}
        />
        {longitudeError && <span className="text-xs text-destructive">{longitudeError}</span>}
      </div>
    </div>
  )
}
