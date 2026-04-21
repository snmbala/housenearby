import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ListingsMap from '../components/Map/ListingsMap'
import ListingCard from '../components/Listing/ListingCard'
import ListingDetailPanel from '../components/Listing/ListingDetailPanel'
import MobileFilterSheet from '../components/Mobile/MobileFilterSheet'
import { useCity } from '../hooks/useCity.jsx'
import { useFilters } from '../hooks/useFilters.jsx'
import { useKeyboard } from '../hooks/useKeyboard.js'
import { useMediaQuery } from '../hooks/useMediaQuery.js'
import SEOMeta from '../components/SEOMeta.jsx'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

const CITY_ALIASES = {
  'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru', 'bengalore': 'Bengaluru',
  'mumbai': 'Mumbai', 'bombay': 'Mumbai',
  'delhi': 'Delhi', 'new delhi': 'Delhi',
  'chennai': 'Chennai', 'madras': 'Chennai',
  'hyderabad': 'Hyderabad', 'pune': 'Pune',
  'kolkata': 'Kolkata', 'calcutta': 'Kolkata',
  'ahmedabad': 'Ahmedabad', 'jaipur': 'Jaipur',
  'kochi': 'Kochi', 'cochin': 'Kochi',
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
  const coords = {
    'Mumbai': [19.0760, 72.8777], 'Delhi': [28.6139, 77.2090],
    'Bengaluru': [12.9716, 77.5946], 'Chennai': [13.0827, 80.2707],
    'Hyderabad': [17.3850, 78.4867], 'Pune': [18.5204, 73.8567],
    'Kolkata': [22.5726, 88.3639], 'Ahmedabad': [23.0225, 72.5714],
    'Jaipur': [26.9124, 75.7873], 'Kochi': [9.9312, 76.2673],
  }
  return coords[city] ?? [20.5937, 78.9629]
}

const PEEK_HEIGHT = 300 // px visible at peek state

export default function Home() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { city, setCity, cityManuallySelected } = useCity()
  const { search, setSearch, propType, maxRent, nearbyMode, setNearbyMode, radiusKm, userCoords, setUserCoords, locationArea } = useFilters()

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState(null)
  const [mapOverride, setMapOverride] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  // Mobile-specific state
  const [sheetSnap, setSheetSnap] = useState('peek') // 'peek' | 'full'
  const [filterOpen, setFilterOpen] = useState(false)
  const [dragHeight, setDragHeight] = useState(null) // px during drag, null otherwise
  const sheetRef = useRef(null)
  const touchStartY = useRef(0)
  const touchStartH = useRef(0)
  const touchStartTime = useRef(0)

  useEffect(() => {
    detectCity().then((result) => {
      if (!result) return
      setUserCoords({ lat: result.lat, lng: result.lng })
      setNearbyMode(true)
      if (result.city) setCity(result.city)
    })
  }, [])

  useEffect(() => { fetchListings() }, [city, propType, maxRent])

  // When listing selected on mobile, expand sheet
  useEffect(() => {
    if (isMobile && selectedListing) setSheetSnap('full')
  }, [selectedListing, isMobile])

  const fetchListings = async () => {
    setLoading(true)
    let query = supabase.from('listings').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (city !== 'All Cities') query = query.eq('city', city)
    if (propType !== 'All') query = query.eq('property_type', propType.toLowerCase())
    if (maxRent) query = query.lte('rent_amount', parseInt(maxRent))
    const { data } = await query
    setListings(data ?? [])
    setLoading(false)
  }

  const filtered = listings
    .filter(l => {
      const matchesSearch = search === '' ||
        l.title?.toLowerCase().includes(search.toLowerCase()) ||
        l.city?.toLowerCase().includes(search.toLowerCase()) ||
        l.address?.toLowerCase().includes(search.toLowerCase())
      const withinRadius = !nearbyMode || !userCoords ||
        haversineKm(userCoords.lat, userCoords.lng, l.lat, l.lng) <= radiusKm
      const matchesArea = !locationArea ||
        l.city?.toLowerCase().includes(locationArea.toLowerCase()) ||
        l.address?.toLowerCase().includes(locationArea.toLowerCase())
      return matchesSearch && withinRadius && matchesArea
    })
    .map(l => ({ ...l, _distKm: userCoords ? haversineKm(userCoords.lat, userCoords.lng, l.lat, l.lng) : null }))
    .sort((a, b) => (a._distKm == null || b._distKm == null) ? 0 : a._distKm - b._distKm)

  const defaultCenter = cityManuallySelected && city !== 'All Cities'
    ? getCityCenter(city) : userCoords ? [userCoords.lat, userCoords.lng] : [20.5937, 78.9629]
  const defaultZoom = cityManuallySelected && city !== 'All Cities' ? 12 : userCoords ? 13 : 5
  const mapCenter = mapOverride ? mapOverride.center : defaultCenter
  const mapZoom = mapOverride ? mapOverride.zoom : defaultZoom

  const selectedIndex = selectedListing ? filtered.findIndex(l => l.id === selectedListing.id) : -1

  const handleSelectListing = (listing) => {
    setSelectedListing(listing)
    setMapOverride({ center: [listing.lat, listing.lng], zoom: 17 })
  }

  const handleCloseDetail = () => {
    setSelectedListing(null)
    setMapOverride(null)
    if (isMobile) setSheetSnap('peek')
  }

  const handleNext = () => { if (selectedIndex < filtered.length - 1) handleSelectListing(filtered[selectedIndex + 1]) }
  const handlePrev = () => { if (selectedIndex > 0) handleSelectListing(filtered[selectedIndex - 1]) }

  useKeyboard({
    Escape:     () => selectedListing && handleCloseDetail(),
    ArrowRight: () => selectedListing && handleNext(),
    ArrowLeft:  () => selectedListing && handlePrev(),
  })

  // ── Touch drag for bottom sheet (height-based) ──────────────
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    touchStartH.current = sheetRef.current?.offsetHeight ?? PEEK_HEIGHT
  }

  const onTouchMove = (e) => {
    const dy = e.touches[0].clientY - touchStartY.current
    const containerH = sheetRef.current?.parentElement?.offsetHeight ?? 800
    const newH = Math.max(PEEK_HEIGHT, Math.min(containerH - 8, touchStartH.current - dy))
    setDragHeight(newH)
  }

  const onTouchEnd = (e) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const dt = Math.max(1, Date.now() - touchStartTime.current)
    const velocity = dy / dt // positive = swipe down
    setDragHeight(null)
    if (dy > 60 || velocity > 0.4) {
      if (selectedListing) handleCloseDetail()
      else setSheetSnap('peek')
    } else if (dy < -60 || velocity < -0.4) {
      setSheetSnap('full')
    }
    // else snap back to current
  }

  const toggleSnap = () => {
    if (selectedListing) { handleCloseDetail(); return }
    setSheetSnap(s => s === 'peek' ? 'full' : 'peek')
  }

  const activeFilterCount = [propType !== 'All', maxRent !== '', locationArea !== ''].filter(Boolean).length

  const resultLabel = locationArea
    ? `${filtered.length} in ${locationArea}`
    : nearbyMode && userCoords
    ? `${filtered.length} within ${radiusKm} km`
    : `${filtered.length} rentals`

  // ── Desktop layout ─────────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-black">
        <SEOMeta
          title={city !== 'All Cities' ? `Rentals in ${city}` : 'Find Rentals Near You'}
          description={`Browse ${filtered.length} rental properties${city !== 'All Cities' ? ` in ${city}` : ' near you'} — apartments, houses, PGs and villas. No broker fees.`}
        />
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1">
            <ListingsMap listings={filtered} center={mapCenter} zoom={mapZoom} userCoords={userCoords} onSelect={handleSelectListing} hoveredId={hoveredId} />
          </div>
          <div className="w-[540px] shrink-0 bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-900 flex flex-col overflow-hidden">
            {selectedListing ? (
              <ListingDetailPanel
                key={selectedListing.id}
                listing={selectedListing}
                onClose={handleCloseDetail}
                onNext={handleNext}
                onPrev={handlePrev}
                hasNext={selectedIndex < filtered.length - 1}
                hasPrev={selectedIndex > 0}
                index={selectedIndex}
                total={filtered.length}
              />
            ) : (
              <div className="overflow-y-auto flex-1">
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-semibold text-neutral-950 dark:text-white">
                    {loading ? 'Loading…' : resultLabel}
                  </p>
                </div>
                <div className="p-3 flex flex-col gap-2.5">
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="bg-neutral-100 dark:bg-neutral-900 rounded-xl h-56 animate-pulse border border-neutral-200 dark:border-neutral-800" />
                    ))
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-3xl mb-3">🏠</p>
                      <p className="font-medium text-neutral-600 dark:text-neutral-400 text-sm">No rentals found</p>
                      <p className="text-xs mt-1 text-neutral-400 dark:text-neutral-600">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filtered.map(listing => (
                      <ListingCard key={listing.id} listing={listing} distKm={listing._distKm} onSelect={handleSelectListing} onHover={setHoveredId} />
                    ))
                  )}
                </div>
              </div>
            )}
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

      <div className="relative h-full bg-neutral-100 dark:bg-neutral-900">

        {/* Full-screen map */}
        <div className="absolute inset-0">
          <ListingsMap
            listings={filtered}
            center={mapCenter}
            zoom={mapZoom}
            userCoords={userCoords}
            onSelect={handleSelectListing}
            hoveredId={hoveredId}
          />
        </div>

        {/* Floating top search bar */}
        <div className="absolute top-0 left-0 right-0 z-[400] pointer-events-none px-3 pt-3">
          <div className="pointer-events-auto flex items-center gap-2 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md rounded-2xl px-3 py-2.5 shadow-lg border border-white/20 dark:border-neutral-800/50">
            <Search size={16} className="text-neutral-400 dark:text-neutral-600 shrink-0" />
            <input
              type="text"
              placeholder="Search area, city or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              className="relative flex items-center gap-1 text-neutral-600 dark:text-neutral-400 shrink-0 py-0.5 px-1"
            >
              <SlidersHorizontal size={16} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Bottom sheet */}
        <div
          ref={sheetRef}
          className="absolute bottom-0 left-0 right-0 z-[300] flex flex-col bg-white dark:bg-neutral-950 rounded-t-3xl shadow-[0_-4px_32px_rgba(0,0,0,0.15)]"
          style={{
            height: dragHeight != null
              ? `${dragHeight}px`
              : (sheetSnap === 'full' || selectedListing) ? 'calc(100% - 8px)' : `${PEEK_HEIGHT}px`,
            transition: dragHeight != null ? 'none' : 'height 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {/* Drag handle area */}
          <div
            className="shrink-0 py-3 flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing select-none"
            onClick={toggleSnap}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-10 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            {/* Count + expand hint */}
            <div className="flex items-center gap-1.5 px-4 w-full justify-between">
              <span className="text-xs font-semibold text-neutral-950 dark:text-white">
                {loading ? 'Loading…' : selectedListing ? selectedListing.title : resultLabel}
              </span>
              {!selectedListing && (
                <ChevronDown
                  size={14}
                  className={`text-neutral-400 dark:text-neutral-600 transition-transform duration-300 ${sheetSnap === 'full' ? 'rotate-0' : 'rotate-180'}`}
                />
              )}
            </div>
          </div>

          {/* Sheet content */}
          <div className="flex-1 overflow-hidden">
            {selectedListing ? (
              <ListingDetailPanel
                key={selectedListing.id}
                listing={selectedListing}
                onClose={handleCloseDetail}
                onNext={handleNext}
                onPrev={handlePrev}
                hasNext={selectedIndex < filtered.length - 1}
                hasPrev={selectedIndex > 0}
                index={selectedIndex}
                total={filtered.length}
              />
            ) : (
              <div className="h-full overflow-y-auto overscroll-contain">
                <div className="px-3 pb-4 flex flex-col gap-2.5">
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl h-32 animate-pulse" />
                    ))
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-4xl mb-3">🏠</p>
                      <p className="font-semibold text-neutral-600 dark:text-neutral-400 text-sm">No rentals found</p>
                      <p className="text-xs mt-1 text-neutral-400 dark:text-neutral-600">Try adjusting your filters</p>
                    </div>
                  ) : (
                    filtered.map(listing => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        distKm={listing._distKm}
                        onSelect={handleSelectListing}
                        onHover={setHoveredId}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter bottom sheet */}
      {filterOpen && <MobileFilterSheet onClose={() => setFilterOpen(false)} />}
    </>
  )
}
