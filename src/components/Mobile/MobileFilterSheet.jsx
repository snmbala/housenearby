import { X, SlidersHorizontal } from 'lucide-react'
import { useFilters } from '../../hooks/useFilters.jsx'
import { useCity, CITIES } from '../../hooks/useCity.jsx'
import PlacesAutocomplete from '../Places/PlacesAutocomplete.jsx'

const PROPERTY_TYPES = ['All', 'Apartment', 'House', 'PG', 'Studio', 'Villa']

export default function MobileFilterSheet({ onClose }) {
  const { propType, setPropType, maxRent, setMaxRent, nearbyMode, setNearbyMode, radiusKm, setRadiusKm, locationArea, setLocationArea, setUserCoords } = useFilters()
  const { city, selectCity } = useCity()

  const clearAll = () => {
    setPropType('All'); setMaxRent(''); setNearbyMode(true); setRadiusKm(6); setLocationArea('')
  }

  return (
    <div className="fixed inset-0 z-[600] flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="bg-white dark:bg-neutral-950 rounded-t-3xl shadow-2xl animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-900">
          <div className="flex items-center gap-2 text-neutral-950 dark:text-white">
            <SlidersHorizontal size={16} />
            <span className="font-semibold text-sm">Filters</span>
          </div>
          <button onClick={clearAll} className="text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
            Clear all
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[70vh]">

          {/* City */}
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2.5">City</p>
            <div className="flex flex-wrap gap-2">
              {CITIES.map(c => (
                <button
                  key={c}
                  onClick={() => selectCity(c)}
                  className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
                    city === c
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-black'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Property type */}
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2.5">Property type</p>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setPropType(t)}
                  className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
                    propType === t
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-black'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2.5">Max budget</p>
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 focus-within:ring-1 focus-within:ring-neutral-950 dark:focus-within:ring-white">
              <span className="text-neutral-400 dark:text-neutral-600 text-sm">₹</span>
              <input
                type="number"
                placeholder="e.g. 25,000"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                className="flex-1 bg-transparent text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 text-sm focus:outline-none"
              />
              {maxRent && (
                <button onClick={() => setMaxRent('')} className="text-neutral-400 hover:text-neutral-700">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2.5">Location</p>
            <div className="space-y-3">
              <button
                onClick={() => { setNearbyMode(true); setLocationArea('') }}
                className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
                  nearbyMode
                    ? 'bg-neutral-950 dark:bg-white text-white dark:text-black'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Nearby
              </button>
              {nearbyMode && (
                <div>
                  <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-500 mb-1.5">
                    <span>Radius</span>
                    <span className="font-semibold text-neutral-950 dark:text-white">{radiusKm} km</span>
                  </div>
                  <input
                    type="range" min="1" max="25" value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full accent-neutral-950 dark:accent-white"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 dark:text-neutral-600 mt-1">
                    <span>1 km</span><span>25 km</span>
                  </div>
                </div>
              )}
              <PlacesAutocomplete
                externalValue={locationArea}
                onChange={(v) => { setLocationArea(v); setNearbyMode(!v.trim()) }}
                onPlaceSelect={({ lat, lng, name }) => {
                  setUserCoords({ lat, lng })
                  setNearbyMode(true)
                  setLocationArea(name || '')
                }}
                placeholder="Or search area (e.g. Whitefield)"
                className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white"
              />
            </div>
          </div>
        </div>

        {/* Done */}
        <div className="px-5 py-4 border-t border-neutral-100 dark:border-neutral-900">
          <button
            onClick={onClose}
            className="w-full bg-neutral-950 dark:bg-white text-white dark:text-black font-semibold py-3.5 rounded-2xl text-sm transition-colors active:opacity-80"
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  )
}
