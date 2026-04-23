import { X, SlidersHorizontal, Check } from 'lucide-react'
import { useFilters } from '../../hooks/useFilters.jsx'
import { useCity, CITIES } from '../../hooks/useCity.jsx'
import { BHK_OPTIONS, AMENITIES } from '../../lib/listing'

const PROPERTY_TYPES = ['All', 'Apartment', 'House', 'PG', 'Studio', 'Villa']

export default function MobileFilterSheet({ onClose }) {
  const { propType, setPropType, maxRent, setMaxRent, bhk, setBhk, amenities, setAmenities } = useFilters()
  const { city, selectCity } = useCity()

  const clearAll = () => {
    setPropType('All'); setMaxRent(''); setBhk([]); setAmenities([])
  }

  const toggleBhk = (v) => setBhk(prev => prev.includes(v) ? prev.filter(b => b !== v) : [...prev, v])
  const toggleAmenity = (v) => setAmenities(prev => prev.includes(v) ? prev.filter(a => a !== v) : [...prev, v])

  const chip = (active) =>
    `px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
      active
        ? 'bg-neutral-950 dark:bg-white text-white dark:text-black'
        : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400'
    }`

  return (
    <div className="fixed inset-0 z-[600] flex flex-col">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="bg-white dark:bg-neutral-950 rounded-t-3xl shadow-2xl animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-900">
          <div className="flex items-center gap-2 text-neutral-950 dark:text-white">
            <SlidersHorizontal size={16} />
            <span className="font-semibold text-sm">Filters</span>
          </div>
          <button onClick={clearAll} className="text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
            Clear all
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[75vh]">

          {/* City */}
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2.5">City</p>
            <div className="flex flex-wrap gap-2">
              {CITIES.map(c => (
                <button key={c} onClick={() => selectCity(c)} className={chip(city === c)}>{c}</button>
              ))}
            </div>
          </div>

          {/* BHK */}
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2.5">Bedrooms</p>
            <div className="flex flex-wrap gap-2">
              {BHK_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => toggleBhk(opt.value)} className={chip(bhk.includes(opt.value))}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Property type */}
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2.5">Property type</p>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map(t => (
                <button key={t} onClick={() => setPropType(t)} className={chip(propType === t)}>{t}</button>
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

          {/* Amenities */}
          <div>
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2.5">Amenities</p>
            <div className="grid grid-cols-2 gap-2">
              {AMENITIES.map(a => {
                const active = amenities.includes(a.value)
                return (
                  <button
                    key={a.value}
                    onClick={() => toggleAmenity(a.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-colors ${
                      active
                        ? 'bg-neutral-950 dark:bg-white text-white dark:text-black border-neutral-950 dark:border-white'
                        : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    {active
                      ? <Check size={11} className="shrink-0" />
                      : <span className="w-3 h-3 rounded border border-neutral-300 dark:border-neutral-700 shrink-0" />}
                    {a.label}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

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
