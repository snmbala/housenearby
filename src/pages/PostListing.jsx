import { useState, useCallback, useRef, useEffect } from 'react'
import SEOMeta from '../components/SEOMeta.jsx'
import { useNavigate, useBlocker } from 'react-router-dom'
import { Upload, X, Loader2, CheckCircle, Search, LocateFixed, ChevronDown, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import ListingsMap from '../components/Map/ListingsMap'
import PlacesAutocomplete from '../components/Places/PlacesAutocomplete.jsx'

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
]

const TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house',     label: 'House' },
  { value: 'pg',        label: 'PG / Hostel' },
  { value: 'villa',     label: 'Villa' },
]

const BHK = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1 BHK' },
  { value: 2, label: '2 BHK' },
  { value: 3, label: '3 BHK' },
  { value: 4, label: '4+ BHK' },
]

const FURNISH = [
  { value: 'unfurnished', label: 'Bare' },
  { value: 'semi',        label: 'Semi' },
  { value: 'furnished',   label: 'Furnished' },
]

const AMENITIES = [
  { value: 'parking_2w',    label: '2-Wheeler Parking' },
  { value: 'parking_4w',    label: '4-Wheeler Parking' },
  { value: 'lift',          label: 'Lift / Elevator' },
  { value: 'power_backup',  label: 'Power Backup' },
  { value: 'security',      label: 'Security / CCTV' },
  { value: 'gym',           label: 'Gym' },
  { value: 'swimming_pool', label: 'Swimming Pool' },
  { value: 'clubhouse',     label: 'Club House' },
  { value: 'garden',        label: 'Garden / Park' },
  { value: 'wifi',          label: 'Wi-Fi' },
  { value: 'gated',         label: 'Gated Community' },
  { value: 'intercom',      label: 'Intercom' },
  { value: 'water_24x7',   label: 'Water 24×7' },
  { value: 'balcony',       label: 'Balcony' },
  { value: 'pet_friendly',  label: 'Pet Friendly' },
  { value: 'ac',            label: 'Air Conditioning' },
]

const PREFERRED_TENANTS = [
  { value: 'any',      label: 'Anyone' },
  { value: 'family',   label: 'Family' },
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'working',  label: 'Working Professional' },
]

const DRAFT_KEY = 'housenearby_post_draft'
const saveDraft = (data) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)) } catch {} }
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) } catch { return null } }
const clearDraft = () => localStorage.removeItem(DRAFT_KEY)

const chip = (active) =>
  `px-4 py-2 rounded-full border text-sm font-medium transition-all cursor-pointer select-none ${
    active
      ? 'bg-neutral-950 dark:bg-white text-white dark:text-black border-neutral-950 dark:border-white'
      : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
  }`

const amenityChip = (active) =>
  `px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer select-none ${
    active
      ? 'bg-neutral-950 dark:bg-white text-white dark:text-black border-neutral-950 dark:border-white'
      : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
  }`

export default function PostListing() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)

  // Step 1 — Basics
  const [propType, setPropType]   = useState('apartment')
  const [bhk, setBhk]             = useState(1)
  const [furnishing, setFurnish]  = useState('unfurnished')
  const [rent, setRent]           = useState('')
  const [deposit, setDeposit]     = useState('')
  const [rentError, setRentError] = useState('')
  const [maintenanceIncluded, setMaintenanceIncluded] = useState(true)
  const [maintenanceAmount, setMaintenanceAmount] = useState('')
  const [preferredTenants, setPreferredTenants] = useState('any')

  // Step 2 — Location
  const [pickedLocation, setPickedLocation] = useState(null)
  const [locCenter, setLocCenter] = useState([20.5937, 78.9629])
  const [locZoom, setLocZoom]     = useState(5)
  const [searchQuery, setSearchQuery]   = useState('')
  const [locating, setLocating]   = useState(false)
  const [autoCity, setAutoCity]   = useState('')
  const [autoState, setAutoState] = useState('')
  const [autoPincode, setAutoPincode] = useState('')

  // Step 3 — Amenities
  const [amenities, setAmenities] = useState([])
  const [description, setDescription] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')

  // Step 4 — Contact + Photos
  const [phone, setPhone]       = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [images, setImages]     = useState([])
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [rateLimitError, setRateLimitError] = useState('')

  // Draft
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState(null)
  const autoSaveTimer = useRef(null)

  const getDraftData = () => ({
    step, propType, bhk, furnishing, rent, deposit,
    maintenanceIncluded, maintenanceAmount, preferredTenants,
    pickedLocation, locCenter, locZoom, searchQuery,
    autoCity, autoState, autoPincode,
    amenities, description, availableFrom, phone,
    savedAt: new Date().toISOString(),
  })

  const isDirty = step > 1 || rent !== '' || propType !== 'apartment' || bhk !== 1 ||
    furnishing !== 'unfurnished' || amenities.length > 0 || description !== '' || phone !== ''

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft) setShowDraftBanner(true)
  }, [])

  // Auto-save debounced
  useEffect(() => {
    if (!isDirty || submitted) return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveDraft(getDraftData())
      setDraftSavedAt(new Date())
    }, 1000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [step, propType, bhk, furnishing, rent, deposit, maintenanceIncluded, maintenanceAmount,
      preferredTenants, pickedLocation, searchQuery, amenities, description, availableFrom, phone])

  // Block browser tab close
  useEffect(() => {
    const handler = (e) => { if (isDirty && !submitted) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty, submitted])

  const restoreDraft = () => {
    const d = loadDraft()
    if (!d) return
    if (d.step) setStep(d.step)
    if (d.propType) setPropType(d.propType)
    if (d.bhk != null) setBhk(d.bhk)
    if (d.furnishing) setFurnish(d.furnishing)
    if (d.rent) setRent(d.rent)
    if (d.deposit) setDeposit(d.deposit)
    if (d.maintenanceIncluded != null) setMaintenanceIncluded(d.maintenanceIncluded)
    if (d.maintenanceAmount) setMaintenanceAmount(d.maintenanceAmount)
    if (d.preferredTenants) setPreferredTenants(d.preferredTenants)
    if (d.pickedLocation) setPickedLocation(d.pickedLocation)
    if (d.locCenter) setLocCenter(d.locCenter)
    if (d.locZoom) setLocZoom(d.locZoom)
    if (d.searchQuery) setSearchQuery(d.searchQuery)
    if (d.autoCity) setAutoCity(d.autoCity)
    if (d.autoState) setAutoState(d.autoState)
    if (d.autoPincode) setAutoPincode(d.autoPincode)
    if (d.amenities) setAmenities(d.amenities)
    if (d.description) setDescription(d.description)
    if (d.availableFrom) setAvailableFrom(d.availableFrom)
    if (d.phone) setPhone(d.phone)
    setShowDraftBanner(false)
  }

  // Navigation blocker
  const blocker = useBlocker(() => isDirty && !submitted)

  // ── Step 1 ──────────────────────────────────────────────
  const goToStep2 = () => {
    if (!rent || parseInt(rent) < 1000) { setRentError('Enter a valid monthly rent (min ₹1,000)'); return }
    setRentError('')
    setStep(2)
  }

  // ── Step 2 ──────────────────────────────────────────────
  const handleMapClick = useCallback((e) => {
    setPickedLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
  }, [])

  const handlePlaceSelect = ({ lat, lng, city, state, pincode, name, formattedAddress }) => {
    setPickedLocation({ lat, lng })
    setLocCenter([lat, lng])
    setLocZoom(17)
    if (city) setAutoCity(city)
    if (pincode) setAutoPincode(pincode.replace(/\s/g, '').slice(0, 6))
    const matched = INDIAN_STATES.find(s =>
      s.toLowerCase() === state.toLowerCase() || state.toLowerCase().includes(s.toLowerCase())
    )
    if (matched) setAutoState(matched)
    setSearchQuery(name ? [name, city].filter(Boolean).join(', ') : formattedAddress.split(',').slice(0, 2).join(', '))
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude; const lng = coords.longitude
        setPickedLocation({ lat, lng }); setLocCenter([lat, lng]); setLocZoom(17)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const addr = data.address || {}
          const city = addr.city || addr.town || addr.village || addr.state_district || ''
          const state = addr.state || ''
          const pincode = (addr.postcode || '').replace(/\s/g, '').slice(0, 6)
          if (city) setAutoCity(city)
          if (pincode) setAutoPincode(pincode)
          const matched = INDIAN_STATES.find(s =>
            s.toLowerCase() === state.toLowerCase() || state.toLowerCase().includes(s.toLowerCase())
          )
          if (matched) setAutoState(matched)
          if (data.display_name) setSearchQuery(data.display_name.split(',').slice(0, 2).join(', '))
        } catch {}
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  // ── Step 3 ──────────────────────────────────────────────
  const toggleAmenity = (val) =>
    setAmenities(prev => prev.includes(val) ? prev.filter(a => a !== val) : [...prev, val])

  // ── Step 4 ──────────────────────────────────────────────
  const addImages = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 8 - images.length)
    setImages(prev => [...prev, ...valid.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
  }

  const removeImage = (i) => {
    setImages(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i) })
  }

  const autoTitle = () => {
    const bhkLabel = bhk === 0 ? 'Studio' : `${bhk} BHK`
    const typeLabel = TYPES.find(t => t.value === propType)?.label ?? propType
    const city = autoCity ? ` in ${autoCity}` : ''
    return bhk === 0 ? `Studio ${typeLabel}${city}` : `${bhkLabel} ${typeLabel}${city}`
  }

  const publish = async () => {
    if (!user) return
    if (!/^[6-9]\d{9}$/.test(phone)) { setPhoneError('Enter a valid 10-digit Indian mobile number'); return }
    setPhoneError('')

    const { count } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (count >= 3) { setRateLimitError('You can only have 3 active listings. Deactivate one first.'); return }

    setUploading(true); setRateLimitError('')

    const imageUrls = []
    for (const img of images) {
      const ext = img.file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('listing-images').upload(path, img.file)
      if (uploadError) { setUploading(false); setRateLimitError(`Image upload failed: ${uploadError.message}`); return }
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(path)
      imageUrls.push(publicUrl)
    }

    const { error } = await supabase.from('listings').insert({
      user_id:               user.id,
      title:                 autoTitle(),
      description:           description || null,
      property_type:         propType,
      bhk,
      rent_amount:           parseInt(rent),
      deposit_amount:        deposit ? parseInt(deposit) : null,
      furnishing,
      maintenance_included:  maintenanceIncluded,
      maintenance_amount:    !maintenanceIncluded && maintenanceAmount ? parseInt(maintenanceAmount) : null,
      preferred_tenants:     preferredTenants,
      amenities:             amenities.length ? amenities : null,
      available_from:        availableFrom || null,
      address:               searchQuery || null,
      city:                  autoCity || null,
      state:                 autoState || null,
      pincode:               autoPincode || null,
      lat:                   pickedLocation.lat,
      lng:                   pickedLocation.lng,
      contact_name:          user.email.split('@')[0],
      contact_phone:         phone,
      contact_email:         user.email,
      images:                imageUrls,
      is_active:             true,
    })

    setUploading(false)
    if (error) setRateLimitError(error.message)
    else { clearDraft(); setSubmitted(true) }
  }

  // ── Success ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-full bg-white dark:bg-black flex items-center justify-center py-20">
        <div className="text-center fade-up px-4">
          <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="text-neutral-700 dark:text-neutral-300" size={28} />
          </div>
          <h2 className="font-[Bricolage_Grotesque] text-xl font-bold text-neutral-950 dark:text-white mb-2">Listing published</h2>
          <p className="text-neutral-400 dark:text-neutral-600 text-sm mb-1">"{autoTitle()}"</p>
          <p className="text-neutral-400 dark:text-neutral-600 text-sm mb-7">Tenants can now find you on the map.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/')} className="bg-neutral-950 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 text-sm font-medium transition-colors">
              Browse listings
            </button>
            <button onClick={() => navigate('/my-listings')} className="border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 px-5 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-sm transition-colors">
              My listings
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-black min-h-full">
      <SEOMeta title="Post a Rental" description="List your property on HouseNearby and reach tenants directly — no broker fees." />

      {/* Draft resume banner */}
      {showDraftBanner && (
        <div className="bg-neutral-950 dark:bg-white text-white dark:text-black px-4 py-3 flex items-center gap-3">
          <FileText size={15} className="shrink-0" />
          <p className="text-sm flex-1">You have an unfinished listing draft.</p>
          <button onClick={restoreDraft} className="text-xs font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity shrink-0">Resume</button>
          <button onClick={() => { clearDraft(); setShowDraftBanner(false) }} className="text-xs text-white/60 dark:text-black/50 hover:text-white dark:hover:text-black transition-colors shrink-0 ml-2">Discard</button>
        </div>
      )}

      {/* Navigation blocker modal */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm fade-up">
            <h3 className="font-[Bricolage_Grotesque] text-base font-bold text-neutral-950 dark:text-white mb-1">Leave without finishing?</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-5">Save as a draft and come back anytime, or discard your progress.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { saveDraft(getDraftData()); blocker.proceed() }}
                className="w-full bg-neutral-950 dark:bg-white text-white dark:text-black font-medium py-2.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors text-sm"
              >
                Save draft
              </button>
              <button
                onClick={() => { clearDraft(); blocker.proceed() }}
                className="w-full border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-sm"
              >
                Discard and leave
              </button>
              <button
                onClick={() => blocker.reset()}
                className="w-full text-neutral-400 dark:text-neutral-600 py-2 text-sm hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 py-10">

        {/* Progress */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex gap-1.5 flex-1">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-300 ${n <= step ? 'bg-neutral-950 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
            ))}
          </div>
          {draftSavedAt && !submitted && (
            <span className="text-[10px] text-neutral-400 dark:text-neutral-600 shrink-0">Draft saved</span>
          )}
        </div>

        {/* ── Step 1: Basics ─────────────────────────────── */}
        {step === 1 && (
          <div className="fade-up space-y-8">
            <div>
              <h1 className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white">What are you renting?</h1>
              <p className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">Takes about 3 minutes</p>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Type</p>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(t => <button key={t.value} type="button" onClick={() => setPropType(t.value)} className={chip(propType === t.value)}>{t.label}</button>)}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Bedrooms</p>
              <div className="flex flex-wrap gap-2">
                {BHK.map(b => <button key={b.value} type="button" onClick={() => setBhk(b.value)} className={chip(bhk === b.value)}>{b.label}</button>)}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Furnishing</p>
              <div className="flex gap-0 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden w-fit">
                {FURNISH.map((f, i) => (
                  <button key={f.value} type="button" onClick={() => setFurnish(f.value)}
                    className={`px-5 py-2.5 text-sm font-medium transition-all cursor-pointer ${furnishing === f.value ? 'bg-neutral-950 dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-black text-neutral-500 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900'} ${i > 0 ? 'border-l border-neutral-200 dark:border-neutral-800' : ''}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Monthly rent</p>
              <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-neutral-950 dark:focus-within:ring-white bg-white dark:bg-black">
                <span className="pl-4 pr-2 text-neutral-400 dark:text-neutral-600 text-lg font-[Bricolage_Grotesque]">₹</span>
                <input type="number" value={rent} onChange={(e) => { setRent(e.target.value); setRentError('') }} placeholder="20,000"
                  className="flex-1 py-3.5 pr-4 text-lg font-[Bricolage_Grotesque] font-semibold text-neutral-950 dark:text-white bg-transparent placeholder-neutral-300 dark:placeholder-neutral-700 focus:outline-none" />
                <span className="pr-4 text-sm text-neutral-400 dark:text-neutral-600">/mo</span>
              </div>
              {rentError && <p className="text-red-500 text-xs mt-1.5">{rentError}</p>}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-neutral-400 dark:text-neutral-600">Deposit (optional) ₹</span>
                <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="e.g. 60,000"
                  className="w-32 bg-transparent border-b border-neutral-200 dark:border-neutral-800 text-sm text-neutral-950 dark:text-white placeholder-neutral-300 dark:placeholder-neutral-700 focus:outline-none focus:border-neutral-950 dark:focus:border-white py-1" />
              </div>
            </div>

            {/* Maintenance */}
            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Maintenance</p>
              <div className="flex gap-0 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden w-fit mb-3">
                {[{ v: true, l: 'Included in rent' }, { v: false, l: 'Charged extra' }].map((o, i) => (
                  <button key={String(o.v)} type="button" onClick={() => setMaintenanceIncluded(o.v)}
                    className={`px-5 py-2.5 text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${maintenanceIncluded === o.v ? 'bg-neutral-950 dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-black text-neutral-500 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900'} ${i > 0 ? 'border-l border-neutral-200 dark:border-neutral-800' : ''}`}>
                    {o.l}
                  </button>
                ))}
              </div>
              {!maintenanceIncluded && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 dark:text-neutral-600">Amount ₹</span>
                  <input type="number" value={maintenanceAmount} onChange={(e) => setMaintenanceAmount(e.target.value)} placeholder="e.g. 2,000 /mo"
                    className="w-36 bg-transparent border-b border-neutral-200 dark:border-neutral-800 text-sm text-neutral-950 dark:text-white placeholder-neutral-300 dark:placeholder-neutral-700 focus:outline-none focus:border-neutral-950 dark:focus:border-white py-1" />
                </div>
              )}
            </div>

            {/* Preferred tenants */}
            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Preferred tenants</p>
              <div className="flex flex-wrap gap-2">
                {PREFERRED_TENANTS.map(t => <button key={t.value} type="button" onClick={() => setPreferredTenants(t.value)} className={chip(preferredTenants === t.value)}>{t.label}</button>)}
              </div>
            </div>

            <button type="button" onClick={goToStep2}
              className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-medium py-3.5 rounded-xl transition-colors text-sm">
              Continue
            </button>
          </div>
        )}

        {/* ── Step 2: Location ───────────────────────────── */}
        {step === 2 && (
          <div className="fade-up space-y-5">
            <div>
              <button type="button" onClick={() => setStep(1)} className="text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-950 dark:hover:text-white mb-4 flex items-center gap-1 transition-colors">← Back</button>
              <h1 className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white">Where is it?</h1>
              <p className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">Search your society or tap the map to pin exactly</p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600 pointer-events-none z-10" size={14} />
                <PlacesAutocomplete
                  externalValue={searchQuery}
                  onChange={setSearchQuery}
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="Society name, landmark, area…"
                  className="w-full pl-9 pr-4 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white"
                />
              </div>
              <button type="button" onClick={useMyLocation} disabled={locating} title="Use my location"
                className="flex items-center justify-center w-11 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 rounded-xl transition-colors shrink-0">
                {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
              </button>
            </div>

            <div className={`rounded-2xl overflow-hidden border transition-colors ${pickedLocation ? 'border-neutral-950 dark:border-white' : 'border-neutral-200 dark:border-neutral-800'}`} style={{ height: 340 }}>
              <ListingsMap
                listings={pickedLocation ? [{ id: 'preview', lat: pickedLocation.lat, lng: pickedLocation.lng, rent_amount: rent || 0, title: autoTitle() }] : []}
                onMapClick={handleMapClick} pickMode center={locCenter} zoom={locZoom}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${pickedLocation ? 'bg-neutral-950 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'}`} />
              <p className="text-xs text-neutral-400 dark:text-neutral-600">
                {pickedLocation ? 'Location set — tap elsewhere to adjust' : 'Tap anywhere on the map to place a pin'}
              </p>
            </div>

            <button type="button" onClick={() => pickedLocation && setStep(3)} disabled={!pickedLocation}
              className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-25 text-white dark:text-black font-medium py-3.5 rounded-xl transition-colors text-sm">
              Continue
            </button>
          </div>
        )}

        {/* ── Step 3: Amenities ──────────────────────────── */}
        {step === 3 && (
          <div className="fade-up space-y-8">
            <div>
              <button type="button" onClick={() => setStep(2)} className="text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-950 dark:hover:text-white mb-4 flex items-center gap-1 transition-colors">← Back</button>
              <h1 className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white">What's available?</h1>
              <p className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">Select all amenities your property has</p>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map(a => (
                  <button key={a.value} type="button" onClick={() => toggleAmenity(a.value)} className={amenityChip(amenities.includes(a.value))}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-2">Description <span className="normal-case text-neutral-300 dark:text-neutral-700">(optional)</span></p>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="Describe the property, nearby landmarks, metro access…"
                className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white resize-none" />
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-2">Available from <span className="normal-case text-neutral-300 dark:text-neutral-700">(optional)</span></p>
              <input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)}
                className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white" />
            </div>

            <button type="button" onClick={() => setStep(4)}
              className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-medium py-3.5 rounded-xl transition-colors text-sm">
              Continue
            </button>
          </div>
        )}

        {/* ── Step 4: Contact + Photos ───────────────────── */}
        {step === 4 && (
          <div className="fade-up space-y-6">
            <div>
              <button type="button" onClick={() => setStep(3)} className="text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-950 dark:hover:text-white mb-4 flex items-center gap-1 transition-colors">← Back</button>
              <h1 className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white">Almost done</h1>
              <p className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">How should tenants reach you?</p>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Your mobile number</p>
              <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-1 transition-colors ${phoneError ? 'border-red-400 focus-within:ring-red-400' : 'border-neutral-200 dark:border-neutral-800 focus-within:ring-neutral-950 dark:focus-within:ring-white'}`}>
                <span className="pl-4 pr-2 text-neutral-400 dark:text-neutral-600 text-sm font-medium bg-neutral-50 dark:bg-neutral-900 py-3.5 border-r border-neutral-200 dark:border-neutral-800">+91</span>
                <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneError('') }} placeholder="98765 43210"
                  className="flex-1 px-4 py-3.5 text-sm text-neutral-950 dark:text-white placeholder-neutral-300 dark:placeholder-neutral-700 bg-white dark:bg-black focus:outline-none" />
              </div>
              {phoneError && <p className="text-red-500 text-xs mt-1.5">{phoneError}</p>}
              <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1.5">Only shared with logged-in users who request contact</p>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Photos <span className="normal-case text-neutral-300 dark:text-neutral-700">(optional, but 3× more enquiries)</span></p>
              <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-6 text-center hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files) }}
                onClick={() => document.getElementById('img-input').click()}>
                <Upload className="mx-auto text-neutral-300 dark:text-neutral-700 mb-2" size={22} />
                <p className="text-sm text-neutral-500 dark:text-neutral-500">Drop photos or <span className="text-neutral-950 dark:text-white font-medium">click to upload</span></p>
                <input id="img-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {images.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden aspect-square bg-neutral-100 dark:bg-neutral-900">
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                      {i === 0 && <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">Cover</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-400 truncate">{autoTitle()}</span>
                <span className="font-[Bricolage_Grotesque] font-bold text-neutral-950 dark:text-white shrink-0 ml-3">₹{Number(rent).toLocaleString('en-IN')}/mo</span>
              </div>
              {!maintenanceIncluded && maintenanceAmount && (
                <p className="text-xs text-neutral-400 dark:text-neutral-600">+ ₹{Number(maintenanceAmount).toLocaleString('en-IN')} maintenance</p>
              )}
              {amenities.length > 0 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-600">{amenities.length} amenit{amenities.length === 1 ? 'y' : 'ies'} selected</p>
              )}
            </div>

            {rateLimitError && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {rateLimitError}
              </div>
            )}

            <button type="button" onClick={publish} disabled={uploading}
              className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-60 text-white dark:text-black font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              {uploading && <Loader2 size={14} className="animate-spin" />}
              {uploading ? 'Publishing…' : 'Publish listing'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
