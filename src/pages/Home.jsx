import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import ListingsMap from '../components/Map/ListingsMap'
import ListingCard from '../components/Listing/ListingCard'
import MobileFilterSheet from '../components/Mobile/MobileFilterSheet'
import { useCity } from '../hooks/useCity.jsx'
import { useFilters } from '../hooks/useFilters.jsx'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import SEOMeta from '../components/SEOMeta.jsx'
import { Search, SlidersHorizontal, X, MapPin, BedDouble, MessageSquare, User, PlusCircle, ChevronDown } from 'lucide-react'
import PlacesAutocomplete from '../components/Places/PlacesAutocomplete.jsx'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import AuthModal from '../components/Auth/AuthModal.jsx'

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

const CITY_ALIASES = {
  'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru', 'bengalore': 'Bengaluru',
  'mumbai': 'Mumbai', 'bombay': 'Mumbai', 'delhi': 'Delhi', 'new delhi': 'Delhi',
  'chennai': 'Chennai', 'madras': 'Chennai', 'hyderabad': 'Hyderabad', 'pune': 'Pune',
  'kolkata': 'Kolkata', 'calcutta': 'Kolkata', 'ahmedabad': 'Ahmedabad',
  'jaipur': 'Jaipur', 'kochi': 'Kochi', 'cochin': 'Kochi',
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

function getCityCenter(city) {
  const c = {
    'Mumbai': [19.0760, 72.8777], 'Delhi': [28.6139, 77.2090],
    'Bengaluru': [12.9716, 77.5946], 'Chennai': [13.0827, 80.2707],
    'Hyderabad': [17.3850, 78.4867], 'Pune': [18.5204, 73.8567],
    'Kolkata': [22.5726, 88.3639], 'Ahmedabad': [23.0225, 72.5714],
    'Jaipur': [26.9124, 75.7873], 'Kochi': [9.9312, 76.2673],
  }
  return c[city] ?? [20.5937, 78.9629]
}

const BHK_LABELS = { 0: 'Studio', 1: '1 BHK', 2: '2 BHK', 3: '3 BHK', 4: '4+ BHK' }
const FURNISHING_LABELS = { furnished: 'Furnished', semi: 'Semi', unfurnished: 'Unfurnished' }

function fmtDist(km) {
  if (km == null) return null
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

// Horizontal swipe card — image grid matches desktop ListingCard
function MobileCard({ listing, distKm, onTap }) {
  const images = listing.images?.slice(0, 3) ?? []

  return (
    <div
      className="snap-center shrink-0 w-[82vw] bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-800 active:scale-[0.97] transition-transform"
      onClick={onTap}
    >
      {/* Image grid — same logic as desktop ListingCard */}
      <div className="h-48 flex gap-0.5 overflow-hidden">
        {images.length === 0 && (
          <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-3xl">🏠</div>
        )}
        {images.length === 1 && (
          <div className="relative w-full h-full">
            <img src={images[0]} alt="" className="w-full h-full object-cover" />
            <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/55 text-white backdrop-blur-sm">
              {FURNISHING_LABELS[listing.furnishing] ?? listing.furnishing}
            </span>
          </div>
        )}
        {images.length === 2 && (
          <>
            <div className="relative w-1/2 h-full">
              <img src={images[0]} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/55 text-white backdrop-blur-sm">
                {FURNISHING_LABELS[listing.furnishing] ?? listing.furnishing}
              </span>
            </div>
            <div className="w-1/2 h-full">
              <img src={images[1]} alt="" className="w-full h-full object-cover" />
            </div>
          </>
        )}
        {images.length >= 3 && (
          <>
            <div className="relative w-3/5 h-full">
              <img src={images[0]} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/55 text-white backdrop-blur-sm">
                {FURNISHING_LABELS[listing.furnishing] ?? listing.furnishing}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 w-2/5 h-full">
              <img src={images[1]} alt="" className="w-full h-1/2 object-cover" />
              <div className="relative w-full h-1/2">
                <img src={images[2]} alt="" className="w-full h-full object-cover" />
                {listing.images.length > 3 && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">+{listing.images.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info row */}
      <div className="px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-neutral-950 dark:text-white leading-snug line-clamp-1 flex-1">
            {listing.title}
          </p>
          <span className="font-[Bricolage_Grotesque] text-sm font-bold text-neutral-950 dark:text-white shrink-0">
            ₹{Number(listing.rent_amount).toLocaleString('en-IN')}
            <span className="font-normal text-neutral-400 dark:text-neutral-600 text-[11px]">/mo</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-600">
            <MapPin size={10} />
            <span className="text-[11px] truncate max-w-[140px]">{listing.city || listing.address || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 dark:text-neutral-600">
            <span className="flex items-center gap-0.5">
              <BedDouble size={10} /> {BHK_LABELS[listing.bhk] ?? `${listing.bhk} BHK`}
            </span>
            {fmtDist(distKm) && <span>{fmtDist(distKm)}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

const PROPERTY_TYPES = ['All', 'Apartment', 'House', 'PG', 'Studio', 'Villa']

function DesktopFilterBar({ search, setSearch, propType, setPropType, maxRent, setMaxRent, nearbyMode, setNearbyMode, radiusKm, setRadiusKm, locationArea, setLocationArea, setUserCoords, activeFilterCount }) {
  const [openPanel, setOpenPanel] = useState(null) // 'propType' | 'price' | 'location'
  const barRef = useRef(null)

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
        <input
          type="text"
          placeholder="Search city, area or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none min-w-0"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 shrink-0">
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
                  onClick={() => { setPropType(t); setOpenPanel(null) }}
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
            maxRent !== ''
              ? 'border-neutral-950 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-black'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600'
          }`}
        >
          {maxRent !== '' ? `Under ₹${Number(maxRent).toLocaleString('en-IN')}` : 'Price'}
          <ChevronDown size={13} className={openPanel === 'price' ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
        </button>
        {openPanel === 'price' && (
          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[1100] p-4 min-w-[220px] search-dropdown">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-2.5">Max budget</p>
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-neutral-950 dark:focus-within:ring-white">
              <span className="text-sm text-neutral-400 dark:text-neutral-600">₹</span>
              <input
                type="number"
                placeholder="e.g. 25,000"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                className="flex-1 bg-transparent text-sm text-neutral-950 dark:text-white placeholder-neutral-400 focus:outline-none"
              />
              {maxRent && <button onClick={() => setMaxRent('')}><X size={13} className="text-neutral-400" /></button>}
            </div>
          </div>
        )}
      </div>

      {/* Location / Nearby pill */}
      <div className="relative">
        <button
          onClick={() => toggle('location')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
            nearbyMode || locationArea
              ? 'border-neutral-950 dark:border-white bg-neutral-950 dark:bg-white text-white dark:text-black'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600'
          }`}
        >
          {locationArea ? locationArea : nearbyMode ? `Nearby · ${radiusKm} km` : 'Location'}
          <ChevronDown size={13} className={openPanel === 'location' ? 'rotate-180' : ''} style={{ transition: 'transform 0.15s' }} />
        </button>
        {openPanel === 'location' && (
          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-[1100] p-4 min-w-[240px] search-dropdown space-y-3">
            <button
              onClick={() => { setNearbyMode(true); setLocationArea('') }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${nearbyMode ? 'bg-neutral-950 dark:bg-white text-white dark:text-black' : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'}`}
            >
              Nearby
            </button>
            {nearbyMode && (
              <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>Radius</span>
                  <span className="font-semibold text-neutral-950 dark:text-white">{radiusKm} km</span>
                </div>
                <input
                  type="range" min="1" max="25" value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full accent-neutral-950 dark:accent-white"
                />
              </div>
            )}
            <PlacesAutocomplete
              externalValue={locationArea}
              onChange={(v) => { setLocationArea(v); setNearbyMode(!v.trim()) }}
              onPlaceSelect={({ lat, lng, name }) => {
                setUserCoords({ lat, lng })
                setNearbyMode(true)
                setLocationArea(name || '')
                setOpenPanel(null)
              }}
              placeholder="Search area (e.g. Whitefield)"
              className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white"
            />
          </div>
        )}
      </div>

      {/* Clear all */}
      {activeFilterCount > 0 && (
        <button
          onClick={() => { setPropType('All'); setMaxRent(''); setNearbyMode(true); setRadiusKm(6); setLocationArea(''); setSearch('') }}
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
  const { search, setSearch, propType, setPropType, maxRent, setMaxRent, nearbyMode, setNearbyMode, radiusKm, setRadiusKm, userCoords, setUserCoords, locationArea, setLocationArea } = useFilters()

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [mapOverride, setMapOverride] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  const navigate = useNavigate()
  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const openListing = (listing) => window.open(`/listing/${listing.id}`, '_blank')

  // Mobile carousel state
  const [activeCardIdx, setActiveCardIdx] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const carouselRef = useRef(null)
  const scrollingProgrammatically = useRef(false)

  useEffect(() => {
    detectCity().then((result) => {
      if (!result) return
      setUserCoords({ lat: result.lat, lng: result.lng })
      setNearbyMode(true)
      if (result.city) setCity(result.city)
    })
  }, [])

  useEffect(() => { fetchListings() }, [city, propType, maxRent])

  const fetchListings = async () => {
    setLoading(true)
    let q = supabase.from('listings').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (city !== 'All Cities') q = q.eq('city', city)
    if (propType !== 'All') q = q.eq('property_type', propType.toLowerCase())
    if (maxRent) q = q.lte('rent_amount', parseInt(maxRent))
    const { data } = await q
    setListings(data ?? [])
    setLoading(false)
  }

  const filtered = listings
    .filter(l => {
      const matchSearch = search === '' || [l.title, l.city, l.address].some(f => f?.toLowerCase().includes(search.toLowerCase()))
      const matchRadius = !nearbyMode || !userCoords || haversineKm(userCoords.lat, userCoords.lng, l.lat, l.lng) <= radiusKm
      const matchArea = !locationArea || [l.city, l.address].some(f => f?.toLowerCase().includes(locationArea.toLowerCase()))
      return matchSearch && matchRadius && matchArea
    })
    .map(l => ({ ...l, _distKm: userCoords ? haversineKm(userCoords.lat, userCoords.lng, l.lat, l.lng) : null }))
    .sort((a, b) => (a._distKm == null || b._distKm == null) ? 0 : a._distKm - b._distKm)

  const defaultCenter = cityManuallySelected && city !== 'All Cities'
    ? getCityCenter(city) : userCoords ? [userCoords.lat, userCoords.lng] : [20.5937, 78.9629]
  const defaultZoom = cityManuallySelected && city !== 'All Cities' ? 12 : userCoords ? 13 : 5
  const mapCenter = mapOverride ? mapOverride.center : defaultCenter
  const mapZoom = mapOverride ? mapOverride.zoom : defaultZoom

  // Pan map when active card changes (mobile)
  useEffect(() => {
    if (!isMobile || !filtered.length) return
    const l = filtered[activeCardIdx]
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
  }, [filtered.length, isMobile])

  // Scroll carousel to a specific index
  const scrollToCard = useCallback((idx) => {
    const el = carouselRef.current
    if (!el) return
    const cardW = el.clientWidth * 0.82 + 12 // 82vw + gap
    scrollingProgrammatically.current = true
    el.scrollTo({ left: idx * cardW, behavior: 'smooth' })
    setTimeout(() => { scrollingProgrammatically.current = false }, 500)
    setActiveCardIdx(idx)
  }, [])

  // Detect active card from scroll position
  const onCarouselScroll = useCallback((e) => {
    if (scrollingProgrammatically.current) return
    const el = e.currentTarget
    const cardW = el.clientWidth * 0.82 + 12
    const idx = Math.round(el.scrollLeft / cardW)
    const clamped = Math.max(0, Math.min(idx, filtered.length - 1))
    if (clamped !== activeCardIdx) setActiveCardIdx(clamped)
  }, [activeCardIdx, filtered.length])

  // Map marker tap → scroll carousel to that listing (mobile) or open in new tab (desktop)
  const handleMapSelect = useCallback((listing) => {
    if (isMobile) {
      const idx = filtered.findIndex(l => l.id === listing.id)
      if (idx >= 0) scrollToCard(idx)
    } else {
      openListing(listing)
    }
  }, [isMobile, filtered, scrollToCard])

  const activeFilterCount = [propType !== 'All', maxRent !== '', locationArea !== ''].filter(Boolean).length
  const resultLabel = locationArea
    ? `${filtered.length} in ${locationArea}`
    : nearbyMode && userCoords
    ? `${filtered.length} within ${radiusKm} km`
    : `${filtered.length} rentals`

  // ── Desktop layout ──────────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-black">
        <SEOMeta
          title={city !== 'All Cities' ? `Rentals in ${city}` : 'Find Rentals Near You'}
          description={`Browse ${filtered.length} rental properties${city !== 'All Cities' ? ` in ${city}` : ' near you'} — apartments, houses, PGs and villas. No broker fees.`}
        />

        {/* ── Filter bar ── */}
        <DesktopFilterBar
          search={search} setSearch={setSearch}
          propType={propType} setPropType={setPropType}
          maxRent={maxRent} setMaxRent={setMaxRent}
          nearbyMode={nearbyMode} setNearbyMode={setNearbyMode}
          radiusKm={radiusKm} setRadiusKm={setRadiusKm}
          locationArea={locationArea} setLocationArea={setLocationArea}
          setUserCoords={setUserCoords}
          activeFilterCount={activeFilterCount}
        />

        <div className="flex-1 overflow-hidden flex">
          {/* Map */}
          <div className="flex-1 min-w-0">
            <ListingsMap listings={filtered} center={mapCenter} zoom={mapZoom} userCoords={userCoords} onSelect={handleMapSelect} hoveredId={hoveredId} />
          </div>

          {/* Right panel */}
          <div className="w-[600px] shrink-0 bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-900 flex flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1">
              <div className="px-4 pt-4 pb-2">
                <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                  {loading ? 'Loading…' : resultLabel}
                </p>
              </div>
              <div className="px-4 pb-4 grid grid-cols-2 gap-3">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-neutral-100 dark:bg-neutral-900 rounded-xl h-64 animate-pulse border border-neutral-200 dark:border-neutral-800" />
                  ))
                ) : filtered.length === 0 ? (
                  <div className="col-span-2 text-center py-16">
                    <p className="text-3xl mb-3">🏠</p>
                    <p className="font-medium text-neutral-600 dark:text-neutral-400 text-sm">No rentals found</p>
                    <p className="text-xs mt-1 text-neutral-400 dark:text-neutral-600">Try adjusting your filters</p>
                  </div>
                ) : (
                  filtered.map(listing => (
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
        description={`Browse ${filtered.length} rental properties${city !== 'All Cities' ? ` in ${city}` : ' near you'} — apartments, houses, PGs and villas. No broker fees.`}
      />

      <div className="flex flex-col h-full bg-neutral-100 dark:bg-neutral-900">

        {/* Map section — flex-1, search bar floats over it */}
        <div className="relative flex-1 min-h-0">
          <ListingsMap
            listings={filtered}
            center={mapCenter}
            zoom={mapZoom}
            userCoords={userCoords}
            onSelect={handleMapSelect}
            hoveredId={hoveredId}
          />

          {/* Floating search + nav bar */}
          <div className="absolute top-0 left-0 right-0 z-[1001] px-3 pt-3 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-white/92 dark:bg-neutral-950/92 backdrop-blur-md rounded-2xl px-3 py-2.5 shadow-lg">
              <Search size={15} className="text-neutral-400 dark:text-neutral-600 shrink-0" />
              <input
                type="text"
                placeholder="Search area, city or title…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 text-sm font-medium focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-neutral-400 dark:text-neutral-600 shrink-0">
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

        {/* Card carousel — natural flex row, always visible above tab bar */}
        <div className="shrink-0 bg-transparent pt-3 pb-3">

          {/* Count + dots */}
          <div className="px-4 mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {loading ? 'Loading…' : resultLabel}
            </span>
            {!loading && filtered.length > 1 && filtered.length <= 12 && (
              <div className="flex items-center gap-1">
                {filtered.map((_, i) => (
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
          ) : filtered.length === 0 ? (
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
              {filtered.map(listing => (
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
