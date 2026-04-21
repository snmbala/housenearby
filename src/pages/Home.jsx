import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Search, SlidersHorizontal, X, MapPin, BedDouble, ArrowLeft } from 'lucide-react'

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

// Horizontal swipe card for mobile carousel
function MobileCard({ listing, distKm, onTap }) {
  const img = listing.images?.[0]
  return (
    <div
      className="snap-center shrink-0 w-[82vw] bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-lg border border-neutral-100 dark:border-neutral-800 active:scale-[0.98] transition-transform"
      onClick={onTap}
    >
      {/* Image */}
      <div className="h-36 bg-neutral-100 dark:bg-neutral-800 relative overflow-hidden">
        {img
          ? <img src={img} alt={listing.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl">🏠</div>
        }
        <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
          {listing.furnishing?.charAt(0).toUpperCase() + listing.furnishing?.slice(1)}
        </span>
      </div>
      {/* Info */}
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-950 dark:text-white leading-snug line-clamp-1 flex-1">
            {listing.title}
          </p>
          <span className="font-[Bricolage_Grotesque] text-sm font-bold text-neutral-950 dark:text-white shrink-0">
            ₹{Number(listing.rent_amount).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-600">
            <MapPin size={11} />
            <span className="text-[11px] truncate max-w-[130px]">{listing.city || listing.address || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-500">
            <span className="flex items-center gap-0.5">
              <BedDouble size={11} />{BHK_LABELS[listing.bhk] ?? `${listing.bhk} BHK`}
            </span>
            {distKm != null && (
              <span className="text-neutral-400 dark:text-neutral-600">
                {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { city, setCity, cityManuallySelected } = useCity()
  const { search, setSearch, propType, maxRent, nearbyMode, setNearbyMode, radiusKm, userCoords, setUserCoords, locationArea } = useFilters()

  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState(null)
  const [mapOverride, setMapOverride] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

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

  const selectedIndex = selectedListing ? filtered.findIndex(l => l.id === selectedListing.id) : -1

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

  // Map marker tap → scroll carousel to that listing (mobile) or open detail (desktop)
  const handleMapSelect = useCallback((listing) => {
    if (isMobile) {
      const idx = filtered.findIndex(l => l.id === listing.id)
      if (idx >= 0) scrollToCard(idx)
    } else {
      setSelectedListing(listing)
      setMapOverride({ center: [listing.lat, listing.lng], zoom: 17 })
    }
  }, [isMobile, filtered, scrollToCard])

  const handleCloseDetail = () => {
    setSelectedListing(null)
    setMapOverride(null)
  }

  const handleNext = () => {
    if (selectedIndex < filtered.length - 1) {
      const next = filtered[selectedIndex + 1]
      setSelectedListing(next)
      setMapOverride({ center: [next.lat, next.lng], zoom: 17 })
    }
  }

  const handlePrev = () => {
    if (selectedIndex > 0) {
      const prev = filtered[selectedIndex - 1]
      setSelectedListing(prev)
      setMapOverride({ center: [prev.lat, prev.lng], zoom: 17 })
    }
  }

  useKeyboard({
    Escape:     () => selectedListing && handleCloseDetail(),
    ArrowRight: () => selectedListing && handleNext(),
    ArrowLeft:  () => selectedListing && handlePrev(),
  })

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
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1">
            <ListingsMap listings={filtered} center={mapCenter} zoom={mapZoom} userCoords={userCoords} onSelect={handleMapSelect} hoveredId={hoveredId} />
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
                      <ListingCard key={listing.id} listing={listing} distKm={listing._distKm} onSelect={handleMapSelect} onHover={setHoveredId} />
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

      <div className="relative h-full bg-neutral-200 dark:bg-neutral-900">

        {/* Full-screen map */}
        <div className="absolute inset-0">
          <ListingsMap
            listings={filtered}
            center={mapCenter}
            zoom={mapZoom}
            userCoords={userCoords}
            onSelect={handleMapSelect}
            hoveredId={hoveredId}
          />
        </div>

        {/* Floating search bar */}
        <div className="absolute top-0 left-0 right-0 z-[400] px-3 pt-3">
          <div className="flex items-center gap-2 bg-white/92 dark:bg-neutral-950/92 backdrop-blur-md rounded-2xl px-3 py-2.5 shadow-lg">
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
          </div>
        </div>

        {/* Card carousel */}
        <div className="absolute bottom-0 left-0 right-0 z-[300] pb-3">

          {/* Result count chip */}
          <div className="px-4 mb-2.5 flex items-center justify-between">
            <span className="bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm text-neutral-700 dark:text-neutral-300 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
              {loading ? 'Loading…' : resultLabel}
            </span>
            {/* Dot indicators */}
            {!loading && filtered.length > 1 && filtered.length <= 12 && (
              <div className="flex items-center gap-1">
                {filtered.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === activeCardIdx
                        ? 'w-4 h-1.5 bg-neutral-950 dark:bg-white'
                        : 'w-1.5 h-1.5 bg-white/60 dark:bg-neutral-600'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Horizontal scroll */}
          {loading ? (
            <div className="flex gap-3 px-4">
              {Array(2).fill(0).map((_, i) => (
                <div key={i} className="shrink-0 w-[82vw] h-[178px] bg-white dark:bg-neutral-900 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm rounded-2xl px-5 py-5 text-center shadow-lg">
              <p className="text-2xl mb-1">🏠</p>
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No rentals found</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-0.5">Try adjusting your filters</p>
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-1 scroll-smooth"
              style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              onScroll={onCarouselScroll}
            >
              {filtered.map(listing => (
                <MobileCard
                  key={listing.id}
                  listing={listing}
                  distKm={listing._distKm}
                  onTap={() => setSelectedListing(listing)}
                />
              ))}
              {/* trailing spacer so last card can center */}
              <div className="shrink-0 w-[9vw]" />
            </div>
          )}
        </div>

        {/* Detail overlay — slides up over the map */}
        {selectedListing && (
          <div className="absolute inset-0 z-[500] bg-white dark:bg-neutral-950 flex flex-col animate-slide-up">
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
          </div>
        )}
      </div>

      {filterOpen && <MobileFilterSheet onClose={() => setFilterOpen(false)} />}
    </>
  )
}
