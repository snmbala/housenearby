import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { supabase } from '../lib/supabase'
import ListingsMap from '../components/Map/ListingsMap'
import ListingCard from '../components/Listing/ListingCard'
import MobileCard from '../components/Listing/MobileCard'
import MobileFilterSheet from '../components/Mobile/MobileFilterSheet'
import { useCity, CITIES } from '../hooks/useCity.jsx'
import { useFilters } from '../hooks/useFilters.jsx'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import SEOMeta from '../components/SEOMeta.jsx'
import { Search, SlidersHorizontal, X, MessageSquare, User, PlusCircle, ChevronDown, Check } from 'lucide-react'
import PlacesAutocomplete from '../components/Places/PlacesAutocomplete.jsx'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import AuthModal from '../components/Auth/AuthModal.jsx'
import { CITY_ALIASES, getCityCenter } from '../lib/cities'
import { BHK_LABELS, BHK_OPTIONS, AMENITIES, RENT_PRESETS } from '../lib/listing'

const BHK_APPLIES_TO = new Set(['All', 'Apartment', 'House', 'Villa'])

const fmtRent = v => {
  const n = Number(v)
  return n >= 100000 ? `₹${n / 100000}L` : `₹${n / 1000}k`
}

const getPriceLabel = (min, max) => {
  if (!min && !max) return 'Price'
  if (min && max) return `${fmtRent(min)} – ${fmtRent(max)}`
  if (min) return `${fmtRent(min)}+`
  return `Up to ${fmtRent(max)}`
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

async function detectCity() {
  const cached = sessionStorage.getItem('userLocation')
  if (cached) return JSON.parse(cached)
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const raw = (data.address?.city || data.address?.town || data.address?.state_district || '').toLowerCase()
          const result = { city: CITY_ALIASES[raw] ?? null, lat: coords.latitude, lng: coords.longitude }
          sessionStorage.setItem('userLocation', JSON.stringify(result))
          resolve(result)
        } catch { resolve(null) }
      },
      () => resolve(null),
      { timeout: 5000 }
    )
  })
}

const PROPERTY_TYPES = ['All', 'Apartment', 'House', 'PG', 'Studio', 'Villa']

function DesktopFilterBar({
  search, setSearch, propType, setPropType, minRent, setMinRent, maxRent, setMaxRent,
  bhk, setBhk, amenities, setAmenities,
  userCoords, setUserCoords, activeFilterCount, setMapOverride, setSearchedCoords,
}) {
  const [openPanel, setOpenPanel] = useState(null) // 'propType' | 'price' | 'bhk' | 'amenities'
  const barRef = useRef(null)
  const searchRef = useRef(null)
  const [hasInput, setHasInput] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (barRef.current && !barRef.current.contains(e.target)) setOpenPanel(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (panel) => setOpenPanel(p => p === panel ? null : panel)

  return (
    <div ref={barRef} className="shrink-0 bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-900 px-4 py-2.5 flex items-center gap-2 z-[999] relative">

      {/* Search input */}
      <div className="flex items-center gap-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 flex-1 max-w-sm focus-within:border-neutral-950 dark:focus-within:border-white transition-colors">
        <Search size={14} className="text-neutral-400 dark:text-neutral-600 shrink-0" />
        <PlacesAutocomplete
          ref={searchRef}
          onChange={(v) => { setSearch(v); setHasInput(v !== '') }}
          onPlaceSelect={({ lat, lng, city: placeCity }) => {
            setUserCoords({ lat, lng })
            const isCityLevel = CITIES.includes(placeCity)
            setMapOverride({ center: [lat, lng], zoom: isCityLevel ? 12 : 15 })
            setSearch('')
            setHasInput(true)
            setSearchedCoords({ lat, lng })
          }}
          placeholder="Search city, area or title…"
          className="flex-1 bg-transparent text-sm text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none min-w-0"
        />
        {(search || hasInput) && (
          <button onClick={() => {
            searchRef.current?.clear(); setSearch(''); setHasInput(false); setSearchedCoords(null)
            if (userCoords) setMapOverride({ center: [userCoords.lat, userCoords.lng], zoom: 14 })
          }} className="text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 shrink-0">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Property type pill */}
      <div className="relative">
        <button
          onClick={() => toggle('propType')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
            propType !== 'All'
              ? 'border-neutral-950 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-black'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600'
          }`}
        >
          {propType === 'All' ? 'Property type' : propType}
          <ChevronDown size={13} className={openPanel === 'propType' ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
        </button>
        {openPanel === 'propType' && (
          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[1100] p-3 min-w-[180px] search-dropdown">
            <div className="flex flex-col gap-1">
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => { setPropType(t); if (!BHK_APPLIES_TO.has(t)) setBhk([]); setOpenPanel(null) }}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    propType === t
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-black font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price pill */}
      <div className="relative">
        <button
          onClick={() => toggle('price')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
            minRent !== '' || maxRent !== ''
              ? 'border-neutral-950 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-black'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600'
          }`}
        >
          {getPriceLabel(minRent, maxRent)}
          <ChevronDown size={13} className={openPanel === 'price' ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
        </button>
        {openPanel === 'price' && (
          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[1100] p-4 min-w-[260px] search-dropdown">
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-3">Rent range / month</p>
            <div className="flex items-center gap-2">
              <select
                value={minRent}
                onChange={e => setMinRent(e.target.value)}
                className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-2 text-sm text-neutral-950 dark:text-white focus:outline-none"
              >
                <option value="">No min</option>
                {RENT_PRESETS.map(p => <option key={p} value={p}>{fmtRent(p)}</option>)}
              </select>
              <span className="text-neutral-400 dark:text-neutral-600 text-sm shrink-0">to</span>
              <select
                value={maxRent}
                onChange={e => setMaxRent(e.target.value)}
                className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-2 text-sm text-neutral-950 dark:text-white focus:outline-none"
              >
                <option value="">No max</option>
                {RENT_PRESETS.map(p => <option key={p} value={p}>{fmtRent(p)}</option>)}
              </select>
            </div>
            {(minRent || maxRent) && (
              <button onClick={() => { setMinRent(''); setMaxRent('') }} className="mt-2.5 text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300">
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* BHK pill — only for property types that have bedrooms */}
      {BHK_APPLIES_TO.has(propType) && (
      <div className="relative">
        <button
          onClick={() => toggle('bhk')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
            bhk.length > 0
              ? 'border-neutral-950 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-black'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600'
          }`}
        >
          {bhk.length === 0 ? 'BHK' : bhk.length === 1 ? BHK_LABELS[bhk[0]] : `${bhk.length} BHKs`}
          <ChevronDown size={13} className={openPanel === 'bhk' ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
        </button>
        {openPanel === 'bhk' && (
          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[1100] p-3 min-w-[200px] search-dropdown">
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2">Bedrooms</p>
            <div className="flex flex-wrap gap-1.5">
              {BHK_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setBhk(prev => prev.includes(opt.value) ? prev.filter(b => b !== opt.value) : [...prev, opt.value])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    bhk.includes(opt.value)
                      ? 'bg-neutral-950 dark:bg-white text-white dark:text-black'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {bhk.length > 0 && (
              <button onClick={() => setBhk([])} className="mt-2.5 text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300">
                Clear
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* Amenities pill */}
      <div className="relative">
        <button
          onClick={() => toggle('amenities')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
            amenities.length > 0
              ? 'border-neutral-950 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-black'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600'
          }`}
        >
          {amenities.length === 0 ? 'Amenities'
            : amenities.length === 1 ? (AMENITIES.find(a => a.value === amenities[0])?.label ?? 'Amenity')
            : `${amenities.length} amenities`}
          <ChevronDown size={13} className={openPanel === 'amenities' ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
        </button>
        {openPanel === 'amenities' && (
          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[1100] p-3 min-w-[280px] search-dropdown">
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest mb-2">Must have</p>
            <div className="grid grid-cols-2 gap-1">
              {AMENITIES.map(a => {
                const active = amenities.includes(a.value)
                return (
                  <button
                    key={a.value}
                    onClick={() => setAmenities(prev => active ? prev.filter(v => v !== a.value) : [...prev, a.value])}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                      active
                        ? 'bg-neutral-950 dark:bg-white text-white dark:text-black'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
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
            {amenities.length > 0 && (
              <button onClick={() => setAmenities([])} className="mt-2.5 text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300">
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {(activeFilterCount > 0 || hasInput) && (
        <button
          onClick={() => {
            setPropType('All'); setMinRent(''); setMaxRent(''); setBhk([]); setAmenities([]); setSearch(''); searchRef.current?.clear(); setHasInput(false); setSearchedCoords(null)
            if (userCoords) setMapOverride({ center: [userCoords.lat, userCoords.lng], zoom: 14 })
          }}
          className="text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors px-1"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

export default function Home() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { city, setCity, cityManuallySelected } = useCity()
  const {
    search, setSearch, propType, setPropType, minRent, setMinRent, maxRent, setMaxRent,
    bhk, setBhk, amenities, setAmenities,
    userCoords, setUserCoords,
  } = useFilters()

  const debouncedSearch = useDebounce(search, 450)

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [mapOverride, setMapOverride] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [mapBounds, setMapBounds] = useState(null)
  const [searchedCoords, setSearchedCoords] = useState(null)
  const hasLoadedOnce = useRef(false)
  const debouncedMapBounds = useDebounce(mapBounds, 600)

  const navigate = useNavigate()
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const openListing = (listing) => window.open(`/listing/${listing.id}`, '_blank')

  // Mobile carousel state
  const [activeCardIdx, setActiveCardIdx] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const carouselRef = useRef(null)
  const scrollingProgrammatically = useRef(false)
  const mobileSearchRef = useRef(null)
  const [mobileHasInput, setMobileHasInput] = useState(false)

  useEffect(() => {
    detectCity().then((result) => {
      if (!result) return
      setUserCoords({ lat: result.lat, lng: result.lng })
      if (result.city) setCity(result.city)
    })
  }, [])

  const fetchListings = useCallback(async () => {
    // First-ever load shows skeleton; subsequent fetches (pan/zoom/filter) are silent —
    // old listings stay visible while new ones load.
    if (!hasLoadedOnce.current) setLoading(true)
    setFetchError(null)

    let q = supabase
      .from('listings').select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(150)

    // Viewport bounding box — primary spatial filter when the map is ready
    if (debouncedMapBounds) {
      q = q
        .gte('lat', debouncedMapBounds.south)
        .lte('lat', debouncedMapBounds.north)
        .gte('lng', debouncedMapBounds.west)
        .lte('lng', debouncedMapBounds.east)
    }

    // Keep city as an additional constraint (user explicitly chose it)
    if (city !== 'All Cities') q = q.eq('city', city)
    if (propType !== 'All') q = q.eq('property_type', propType.toLowerCase())
    if (minRent) q = q.gte('rent_amount', parseInt(minRent))
    if (maxRent) q = q.lte('rent_amount', parseInt(maxRent))
    if (bhk.length > 0) {
      const specific = bhk.filter(b => b < 4)
      const fourPlus = bhk.includes(4)
      if (specific.length > 0 && fourPlus) q = q.or(`bhk.in.(${specific.join(',')}),bhk.gte.4`)
      else if (fourPlus) q = q.gte('bhk', 4)
      else q = q.in('bhk', specific)
    }

    const { data, error } = await q
    if (error) {
      setFetchError('Failed to load listings. Please try again.')
    } else {
      setListings(data ?? [])
    }
    setLoading(false)
    hasLoadedOnce.current = true
  }, [debouncedMapBounds, city, propType, minRent, maxRent, bhk.join(',')])

  useEffect(() => { fetchListings() }, [fetchListings])

  const allFiltered = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase()
    const searchNorm = (CITY_ALIASES[searchLower] ?? debouncedSearch).toLowerCase()
    return listings
      .filter(l => {
        if (debouncedSearch !== '') {
          const fields = [l.title, l.city, l.address]
          if (!fields.some(f =>
            f?.toLowerCase().includes(searchLower) ||
            (searchNorm !== searchLower && f?.toLowerCase().includes(searchNorm))
          )) return false
        }
        if (amenities.length > 0) {
          if (!amenities.every(a => l.amenities?.includes(a))) return false
        }
        return true
      })
      .map(l => ({ ...l, _distKm: userCoords ? haversineKm(userCoords.lat, userCoords.lng, l.lat, l.lng) : null }))
      .sort((a, b) => (a._distKm == null || b._distKm == null) ? 0 : a._distKm - b._distKm)
  }, [listings, debouncedSearch, userCoords, amenities])

  // DB already filters by viewport; allFiltered just applies text + amenity pass
  const visibleListings = allFiltered

  const defaultCenter = cityManuallySelected && city !== 'All Cities'
    ? getCityCenter(city) : userCoords ? [userCoords.lat, userCoords.lng] : [20.5937, 78.9629]
  const defaultZoom = cityManuallySelected && city !== 'All Cities' ? 12 : userCoords ? 14 : 5
  const mapCenter = mapOverride ? mapOverride.center : defaultCenter
  const mapZoom = mapOverride ? mapOverride.zoom : defaultZoom

  const handleBoundsChange = useCallback((bounds) => setMapBounds(bounds), [])

  // Pan map when active card changes (mobile)
  useEffect(() => {
    if (!isMobile || !allFiltered.length) return
    const l = allFiltered[activeCardIdx]
    if (l?.lat && l?.lng) {
      setMapOverride({ center: [l.lat, l.lng], zoom: 15 })
      setHoveredId(l.id)
    }
  }, [activeCardIdx, isMobile])

  // Reset active card when filter results change
  useEffect(() => {
    if (isMobile) {
      setActiveCardIdx(0)
      carouselRef.current?.scrollTo({ left: 0, behavior: 'instant' })
    }
  }, [allFiltered.length, isMobile])

  // Scroll carousel using the card's actual DOM position to avoid magic numbers
  const scrollToCard = useCallback((idx) => {
    const el = carouselRef.current
    if (!el) return
    const card = el.children[idx]
    if (!card) return
    scrollingProgrammatically.current = true
    el.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' }) // 16 = px-4 padding
    setTimeout(() => { scrollingProgrammatically.current = false }, 500)
    setActiveCardIdx(idx)
  }, [])

  // Detect active card from scroll — reads card width from DOM, no dep on activeCardIdx
  const onCarouselScroll = useCallback((e) => {
    if (scrollingProgrammatically.current) return
    const el = e.currentTarget
    const firstCard = el.children[0]
    if (!firstCard) return
    const cardW = firstCard.offsetWidth + 12 // 12 = gap-3
    const idx = Math.round(el.scrollLeft / cardW)
    setActiveCardIdx(prev => {
      const clamped = Math.max(0, Math.min(idx, el.children.length - 2)) // -2 for trailing spacer
      return clamped !== prev ? clamped : prev
    })
  }, [])

  // Map marker tap → scroll carousel to that listing (mobile) or open in new tab (desktop)
  const handleMapSelect = useCallback((listing) => {
    if (isMobile) {
      const idx = allFiltered.findIndex(l => l.id === listing.id)
      if (idx >= 0) scrollToCard(idx)
    } else {
      openListing(listing)
    }
  }, [isMobile, allFiltered, scrollToCard])

  const activeFilterCount = [propType !== 'All', minRent !== '' || maxRent !== '', BHK_APPLIES_TO.has(propType) && bhk.length > 0, amenities.length > 0].filter(Boolean).length
  const resultLabel = `${allFiltered.length} in view`

  // ── Desktop layout ──────────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-black">
        <SEOMeta
          title={city !== 'All Cities' ? `Rentals in ${city}` : 'Find Rentals Near You'}
          description={`Browse ${visibleListings.length} rental properties${city !== 'All Cities' ? ` in ${city}` : ' near you'} — apartments, houses, PGs and villas. No broker fees.`}
        />

        <DesktopFilterBar
          search={search} setSearch={setSearch}
          propType={propType} setPropType={setPropType}
          minRent={minRent} setMinRent={setMinRent}
          maxRent={maxRent} setMaxRent={setMaxRent}
          bhk={bhk} setBhk={setBhk}
          amenities={amenities} setAmenities={setAmenities}
          userCoords={userCoords}
          setUserCoords={setUserCoords}
          activeFilterCount={activeFilterCount}
          setMapOverride={setMapOverride}
          setSearchedCoords={setSearchedCoords}
        />

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 min-w-0">
            <ListingsMap listings={allFiltered} center={mapCenter} zoom={mapZoom} userCoords={userCoords} searchedCoords={searchedCoords} onSelect={handleMapSelect} hoveredId={hoveredId} onBoundsChange={handleBoundsChange} />
          </div>

          <div className="w-[600px] shrink-0 bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-900 flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1">
              <div className="px-4 pt-4 pb-2">
                <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                  {loading ? 'Loading…' : fetchError ?? resultLabel}
                </p>
              </div>
              <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-neutral-100 dark:bg-neutral-900 rounded-xl h-64 animate-pulse border border-neutral-200 dark:border-neutral-800" />
                  ))
                ) : fetchError ? (
                  <div className="col-span-2 text-center py-16">
                    <p className="text-3xl mb-3">⚠️</p>
                    <p className="font-medium text-neutral-600 dark:text-neutral-400 text-sm">{fetchError}</p>
                    <button onClick={fetchListings} className="mt-3 text-xs underline text-neutral-500">Retry</button>
                  </div>
                ) : visibleListings.length === 0 ? (
                  <div className="col-span-2 text-center py-16">
                    <p className="text-3xl mb-3">🏠</p>
                    <p className="font-medium text-neutral-600 dark:text-neutral-400 text-sm">No rentals in this area</p>
                    <p className="text-xs mt-1 text-neutral-400 dark:text-neutral-600">Pan or zoom out to see more</p>
                  </div>
                ) : (
                  visibleListings.map(listing => (
                    <ListingCard key={listing.id} listing={listing} distKm={listing._distKm} onHover={setHoveredId} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Mobile layout ───────────────────────────────────────────
  return (
    <>
      <SEOMeta
        title={city !== 'All Cities' ? `Rentals in ${city}` : 'Find Rentals Near You'}
        description={`Browse ${allFiltered.length} rental properties${city !== 'All Cities' ? ` in ${city}` : ' near you'} — apartments, houses, PGs and villas. No broker fees.`}
      />

      <div className="flex flex-col h-full bg-neutral-100 dark:bg-neutral-900">

        <div className="relative flex-1 min-h-0">
          <ListingsMap
            listings={allFiltered}
            center={mapCenter}
            zoom={mapZoom}
            userCoords={userCoords}
            searchedCoords={searchedCoords}
            onSelect={handleMapSelect}
            hoveredId={hoveredId}
            onBoundsChange={handleBoundsChange}
          />

          {/* Floating search + nav bar */}
          <div className="absolute top-0 left-0 right-0 z-[1001] px-3 pt-3 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-white/92 dark:bg-neutral-950/92 backdrop-blur-md rounded-2xl px-3 py-2.5 shadow-lg">
              <Search size={15} className="text-neutral-400 dark:text-neutral-600 shrink-0" />
              <PlacesAutocomplete
                ref={mobileSearchRef}
                onChange={(v) => { setSearch(v); setMobileHasInput(v !== '') }}
                onPlaceSelect={({ lat, lng, city: placeCity }) => {
                  setUserCoords({ lat, lng })
                  const isCityLevel = CITIES.includes(placeCity)
                  setMapOverride({ center: [lat, lng], zoom: isCityLevel ? 12 : 15 })
                  setSearch('')
                  setMobileHasInput(true)
                  setSearchedCoords({ lat, lng })
                }}
                placeholder="Search area, city or title…"
                className="flex-1 bg-transparent text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 text-sm font-medium focus:outline-none"
              />
              {(search || mobileHasInput) && (
                <button onClick={() => {
                  mobileSearchRef.current?.clear(); setSearch(''); setMobileHasInput(false); setSearchedCoords(null)
                  if (userCoords) setMapOverride({ center: [userCoords.lat, userCoords.lng], zoom: 14 })
                }} className="text-neutral-400 dark:text-neutral-600 shrink-0">
                  <X size={14} />
                </button>
              )}
              <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 shrink-0" />
              <button
                onClick={() => setFilterOpen(true)}
                className="relative flex items-center text-neutral-500 dark:text-neutral-400 px-1"
              >
                <SlidersHorizontal size={16} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1 w-4 h-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 shrink-0" />
              <button
                onClick={() => navigate('/messages')}
                className="relative text-neutral-500 dark:text-neutral-400 px-1"
              >
                <MessageSquare size={16} />
              </button>
              <button
                onClick={() => user ? navigate('/profile') : setShowAuth(true)}
                className="text-neutral-500 dark:text-neutral-400 px-1"
              >
                <User size={16} />
              </button>
              <button
                onClick={() => user ? navigate('/post') : setShowAuth(true)}
                className="w-7 h-7 rounded-lg bg-neutral-950 dark:bg-white flex items-center justify-center shrink-0"
              >
                <PlusCircle size={15} className="text-white dark:text-black" />
              </button>
            </div>
          </div>

          {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>

        {/* Card carousel */}
        <div className="shrink-0 bg-transparent pt-3 pb-3">
          <div className="px-4 mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {loading ? 'Loading…' : fetchError ? 'Failed to load' : resultLabel}
            </span>
            {!loading && !fetchError && allFiltered.length > 1 && allFiltered.length <= 12 && (
              <div className="flex items-center gap-1">
                {allFiltered.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === activeCardIdx
                        ? 'w-4 h-1.5 bg-neutral-950 dark:bg-white'
                        : 'w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex gap-3 px-4">
              {Array(2).fill(0).map((_, i) => (
                <div key={i} className="shrink-0 w-[82vw] h-[200px] bg-neutral-100 dark:bg-neutral-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : fetchError ? (
            <div className="mx-4 py-4 text-center">
              <p className="text-sm font-medium text-neutral-500">{fetchError}</p>
              <button onClick={fetchListings} className="mt-2 text-xs underline text-neutral-400">Retry</button>
            </div>
          ) : allFiltered.length === 0 ? (
            <div className="mx-4 py-4 text-center">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-500">No rentals found — try adjusting filters</p>
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-0.5"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              onScroll={onCarouselScroll}
            >
              {allFiltered.map(listing => (
                <MobileCard
                  key={listing.id}
                  listing={listing}
                  distKm={listing._distKm}
                  onTap={() => openListing(listing)}
                />
              ))}
              <div className="shrink-0 w-4" />
            </div>
          )}
        </div>

      </div>

      {filterOpen && <MobileFilterSheet onClose={() => setFilterOpen(false)} />}
    </>
  )
}
