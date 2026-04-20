import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ListingsMap from '../components/Map/ListingsMap'
import ListingCard from '../components/Listing/ListingCard'

const PROPERTY_TYPES = ['All', 'Apartment', 'House', 'PG', 'Studio', 'Villa']
const CITIES = ['All Cities', 'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi']

const CITY_ALIASES = {
  'bangalore': 'Bengaluru', 'bengaluru': 'Bengaluru', 'bengalore': 'Bengaluru',
  'mumbai': 'Mumbai', 'bombay': 'Mumbai',
  'delhi': 'Delhi', 'new delhi': 'Delhi',
  'chennai': 'Chennai', 'madras': 'Chennai',
  'hyderabad': 'Hyderabad',
  'pune': 'Pune',
  'kolkata': 'Kolkata', 'calcutta': 'Kolkata',
  'ahmedabad': 'Ahmedabad',
  'jaipur': 'Jaipur',
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
        } catch {
          resolve(null)
        }
      },
      () => resolve(null),
      { timeout: 5000 }
    )
  })
}

export default function Home() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('All Cities')
  const [propType, setPropType] = useState('All')
  const [maxRent, setMaxRent] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [userCoords, setUserCoords] = useState(null)
  const [cityManuallySelected, setCityManuallySelected] = useState(false)

  useEffect(() => {
    detectCity().then((result) => {
      if (!result) return
      setUserCoords({ lat: result.lat, lng: result.lng })
      if (result.city) setCity(result.city)
    })
  }, [])

  useEffect(() => {
    fetchListings()
  }, [city, propType, maxRent])

  const fetchListings = async () => {
    setLoading(true)
    let query = supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (city !== 'All Cities') query = query.eq('city', city)
    if (propType !== 'All') query = query.eq('property_type', propType.toLowerCase())
    if (maxRent) query = query.lte('rent_amount', parseInt(maxRent))

    const { data } = await query
    setListings(data ?? [])
    setLoading(false)
  }

  const filtered = listings.filter(l =>
    search === '' ||
    l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.city?.toLowerCase().includes(search.toLowerCase()) ||
    l.address?.toLowerCase().includes(search.toLowerCase())
  )

  const mapCenter = cityManuallySelected && city !== 'All Cities'
    ? getCityCenter(city)
    : userCoords
      ? [userCoords.lat, userCoords.lng]
      : [20.5937, 78.9629]

  const mapZoom = cityManuallySelected && city !== 'All Cities' ? 12 : userCoords ? 19 : 5

  const activeFilters = propType !== 'All' || maxRent !== ''

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black">

      {/* Search bar */}
      <div className="bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-900 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex gap-2">

          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600 pointer-events-none" size={14} />
            <input
              type="text"
              placeholder="Search by city, area or title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setCityManuallySelected(true) }}
            className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white"
          >
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 border rounded-lg px-3 py-2 text-sm transition-colors ${
              showFilters || activeFilters
                ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white bg-neutral-950/5 dark:bg-white/5'
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters && <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 dark:bg-white" />}
          </button>
        </div>

        {showFilters && (
          <div className="max-w-7xl mx-auto mt-2.5 flex flex-wrap gap-1.5 items-center">
            {PROPERTY_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setPropType(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  propType === t
                    ? 'bg-neutral-950 dark:bg-white text-white dark:text-black'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}
              >
                {t}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-1 pl-2 border-l border-neutral-200 dark:border-neutral-800">
              <span className="text-xs text-neutral-400 dark:text-neutral-600">Max ₹</span>
              <input
                type="number"
                placeholder="25000"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                className="w-24 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white"
              />
              {maxRent && (
                <button onClick={() => setMaxRent('')} className="text-neutral-400 hover:text-neutral-700 dark:text-neutral-600 dark:hover:text-neutral-300">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Count */}
      <div className="px-4 py-1.5 text-xs text-neutral-400 dark:text-neutral-600 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-900">
        <div className="max-w-7xl mx-auto">
          {loading ? 'Loading…' : `${filtered.length} rental${filtered.length !== 1 ? 's' : ''} found`}
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1">
          <ListingsMap listings={filtered} center={mapCenter} zoom={mapZoom} userCoords={userCoords} />
        </div>

        <div className="w-76 overflow-y-auto bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-900">
          <div className="p-3 flex flex-col gap-3">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-neutral-100 dark:bg-neutral-900 rounded-xl h-56 animate-pulse border border-neutral-200 dark:border-neutral-800" />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-neutral-400 dark:text-neutral-600">
                <p className="text-3xl mb-3">🏠</p>
                <p className="font-medium text-neutral-600 dark:text-neutral-400 text-sm">No rentals found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filtered.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getCityCenter(city) {
  const coords = {
    'Mumbai': [19.0760, 72.8777],
    'Delhi': [28.6139, 77.2090],
    'Bengaluru': [12.9716, 77.5946],
    'Chennai': [13.0827, 80.2707],
    'Hyderabad': [17.3850, 78.4867],
    'Pune': [18.5204, 73.8567],
    'Kolkata': [22.5726, 88.3639],
    'Ahmedabad': [23.0225, 72.5714],
    'Jaipur': [26.9124, 75.7873],
    'Kochi': [9.9312, 76.2673],
  }
  return coords[city] ?? [20.5937, 78.9629]
}
