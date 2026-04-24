import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { useGoogleMaps } from '../../hooks/useGoogleMaps'

// Uncontrolled input wired to Google Places Autocomplete.
// externalValue: syncs programmatic changes back into the DOM input (e.g. clear, draft restore).
// onChange: called on every keystroke so parent can track raw text.
// onPlaceSelect: called when user picks a suggestion, with { lat, lng, city, state, pincode, name, formattedAddress }.
// ref: exposes { clear() } so parent can imperatively clear the input without touching externalValue.
const PlacesAutocomplete = forwardRef(function PlacesAutocomplete(
  { externalValue, onChange, onPlaceSelect, placeholder, className },
  ref
) {
  const { loaded } = useGoogleMaps()
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  useEffect(() => { onPlaceSelectRef.current = onPlaceSelect }, [onPlaceSelect])

  useImperativeHandle(ref, () => ({
    clear: () => { if (inputRef.current) inputRef.current.value = '' },
  }))

  useEffect(() => {
    if (inputRef.current && externalValue !== undefined) {
      inputRef.current.value = externalValue
    }
  }, [externalValue])

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'in' },
      fields: ['geometry', 'address_components', 'formatted_address', 'name'],
    })

    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place?.geometry) return

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const get = (type) =>
        place.address_components?.find(c => c.types.includes(type))?.long_name ?? ''

      onPlaceSelectRef.current?.({
        lat,
        lng,
        city: get('locality') || get('administrative_area_level_2'),
        state: get('administrative_area_level_1'),
        pincode: get('postal_code'),
        name: place.name,
        formattedAddress: place.formatted_address,
      })
    })

    autocompleteRef.current = ac

    return () => {
      window.google.maps.event.clearInstanceListeners(ac)
      autocompleteRef.current = null
    }
  }, [loaded])

  return (
    <input
      ref={inputRef}
      type="text"
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  )
})

export default PlacesAutocomplete
