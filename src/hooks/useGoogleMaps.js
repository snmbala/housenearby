import { useState, useEffect } from 'react'

const SCRIPT_ID = 'google-maps-places'

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(
    () => typeof window !== 'undefined' && !!window.google?.maps?.places
  )
  const [error, setError] = useState(false)

  useEffect(() => {
    if (loaded) return

    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      const onLoad = () => setLoaded(true)
      const onError = () => setError(true)
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', onError)
      return () => {
        existing.removeEventListener('load', onLoad)
        existing.removeEventListener('error', onError)
      }
    }

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key || key === 'YOUR_KEY_HERE') return

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.onload = () => setLoaded(true)
    script.onerror = () => setError(true)
    document.head.appendChild(script)
  }, [])

  return { loaded, error }
}
