import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Upload, X, Loader2, CheckCircle, Search, LocateFixed, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import ListingsMap from '../components/Map/ListingsMap'

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

const chip = (active) =>
  `px-4 py-2 rounded-full border text-sm font-medium transition-all cursor-pointer select-none ${
    active
      ? 'bg-neutral-950 dark:bg-white text-white dark:text-black border-neutral-950 dark:border-white'
      : 'bg-white dark:bg-black text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
  }`

export default function EditListing() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [propType, setPropType]   = useState('apartment')
  const [bhk, setBhk]             = useState(1)
  const [furnishing, setFurnish]  = useState('unfurnished')
  const [rent, setRent]           = useState('')
  const [deposit, setDeposit]     = useState('')
  const [rentError, setRentError] = useState('')

  // Step 2
  const [pickedLocation, setPickedLocation] = useState(null)
  const [locCenter, setLocCenter] = useState([20.5937, 78.9629])
  const [locZoom, setLocZoom]     = useState(5)
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [locating, setLocating]   = useState(false)
  const [autoCity, setAutoCity]   = useState('')
  const [autoState, setAutoState] = useState('')
  const [autoPincode, setAutoPincode] = useState('')
  const searchTimer = useRef(null)

  // Step 3
  const [phone, setPhone]           = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [existingImages, setExistingImages] = useState([]) // URLs already in storage
  const [removedImages, setRemovedImages]   = useState([]) // URLs removed during edit
  const [newImages, setNewImages]   = useState([])         // { file, preview }
  const [showOptional, setShowOptional] = useState(false)
  const [description, setDescription]   = useState('')
  const [availableFrom, setAvailableFrom] = useState('')

  useEffect(() => {
    if (user) fetchListing()
  }, [user])

  const fetchListing = async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) { navigate('/my-listings'); return }

    setPropType(data.property_type ?? 'apartment')
    setBhk(data.bhk ?? 1)
    setFurnish(data.furnishing ?? 'unfurnished')
    setRent(String(data.rent_amount ?? ''))
    setDeposit(data.deposit_amount ? String(data.deposit_amount) : '')
    setPhone(data.contact_phone ?? '')
    setDescription(data.description ?? '')
    setAvailableFrom(data.available_from ?? '')
    setSearchQuery(data.address ?? '')
    setAutoCity(data.city ?? '')
    setAutoState(data.state ?? '')
    setAutoPincode(data.pincode ?? '')
    setExistingImages(data.images ?? [])
    if (data.lat && data.lng) {
      setPickedLocation({ lat: data.lat, lng: data.lng })
      setLocCenter([data.lat, data.lng])
      setLocZoom(14)
    }
    if (data.description || data.available_from) setShowOptional(true)
    setLoading(false)
  }

  const goToStep2 = () => {
    if (!rent || parseInt(rent) < 1000) {
      setRentError('Enter a valid monthly rent (min ₹1,000)')
      return
    }
    setRentError('')
    setStep(2)
  }

  const handleMapClick = useCallback((e) => {
    setPickedLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
  }, [])

  const handleSearch = (q) => {
    setSearchQuery(q)
    clearTimeout(searchTimer.current)
    if (q.length < 3) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=in&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        setSearchResults(await res.json())
      } catch {}
      setSearchLoading(false)
    }, 400)
  }

  const applyGeocode = (addr, displayName) => {
    const city = addr.city || addr.town || addr.village || addr.state_district || ''
    const state = addr.state || ''
    const pincode = (addr.postcode || '').replace(/\s/g, '').slice(0, 6)
    if (city) setAutoCity(city)
    if (pincode) setAutoPincode(pincode)
    const matched = INDIAN_STATES.find(s =>
      s.toLowerCase() === state.toLowerCase() || state.toLowerCase().includes(s.toLowerCase())
    )
    if (matched) setAutoState(matched)
    if (displayName) setSearchQuery(displayName.split(',').slice(0, 2).join(', '))
  }

  const selectResult = (r) => {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    setPickedLocation({ lat, lng })
    setLocCenter([lat, lng])
    setLocZoom(17)
    setSearchResults([])
    applyGeocode(r.address || {}, r.display_name)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude; const lng = coords.longitude
        setPickedLocation({ lat, lng })
        setLocCenter([lat, lng])
        setLocZoom(17)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          applyGeocode(data.address || {}, data.display_name)
        } catch {}
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  const addImages = (files) => {
    const slots = 8 - existingImages.length - newImages.length
    const valid = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, slots)
    setNewImages(prev => [...prev, ...valid.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
  }

  const removeExisting = (i) => {
    const url = existingImages[i]
    setRemovedImages(prev => [...prev, url])
    setExistingImages(prev => prev.filter((_, j) => j !== i))
  }
  const removeNew = (i) => {
    setNewImages(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i) })
  }

  const autoTitle = () => {
    const bhkLabel = bhk === 0 ? 'Studio' : `${bhk} BHK`
    const typeLabel = TYPES.find(t => t.value === propType)?.label ?? propType
    const city = autoCity ? ` in ${autoCity}` : ''
    return bhk === 0 ? `Studio ${typeLabel}${city}` : `${bhkLabel} ${typeLabel}${city}`
  }

  const save = async () => {
    if (!user) return
    if (!/^[6-9]\d{9}$/.test(phone)) { setPhoneError('Enter a valid 10-digit Indian mobile number'); return }
    setPhoneError('')
    setUploading(true)
    setError('')

    const uploadedUrls = []
    for (const img of newImages) {
      const ext = img.file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('listing-images').upload(path, img.file)
      if (uploadError) {
        setUploading(false)
        setError(`Image upload failed: ${uploadError.message}`)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(path)
      uploadedUrls.push(publicUrl)
    }

    const removedPaths = removedImages
      .map(url => url.split('/listing-images/')[1])
      .filter(Boolean)
    if (removedPaths.length > 0) {
      await supabase.storage.from('listing-images').remove(removedPaths)
    }

    const { error: updateError } = await supabase.from('listings').update({
      title:          autoTitle(),
      description:    description || null,
      property_type:  propType,
      bhk:            bhk,
      rent_amount:    parseInt(rent),
      deposit_amount: deposit ? parseInt(deposit) : null,
      furnishing:     furnishing,
      available_from: availableFrom || null,
      address:        searchQuery || null,
      city:           autoCity || null,
      state:          autoState || null,
      pincode:        autoPincode || null,
      lat:            pickedLocation.lat,
      lng:            pickedLocation.lng,
      contact_phone:  phone,
      images:         [...existingImages, ...uploadedUrls],
    }).eq('id', id).eq('user_id', user.id)

    setUploading(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSubmitted(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-black">
        <Loader2 className="animate-spin text-neutral-400" size={28} />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-full bg-white dark:bg-black flex items-center justify-center py-20">
        <div className="text-center fade-up px-4">
          <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="text-neutral-700 dark:text-neutral-300" size={28} />
          </div>
          <h2 className="font-[Bricolage_Grotesque] text-xl font-bold text-neutral-950 dark:text-white mb-2">Listing updated</h2>
          <p className="text-neutral-400 dark:text-neutral-600 text-sm mb-7">Your changes are live.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate(`/listing/${id}`)} className="bg-neutral-950 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 text-sm font-medium transition-colors">
              View listing
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
      <div className="max-w-xl mx-auto px-4 py-10">

        <div className="flex gap-1.5 mb-10">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-300 ${n <= step ? 'bg-neutral-950 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="fade-up space-y-8">
            <div>
              <h1 className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white">Edit listing</h1>
              <p className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">Update the basics</p>
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

            <button type="button" onClick={goToStep2}
              className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black font-medium py-3.5 rounded-xl transition-colors text-sm">
              Continue
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="fade-up space-y-5">
            <div>
              <button type="button" onClick={() => setStep(1)} className="text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-950 dark:hover:text-white mb-4 flex items-center gap-1 transition-colors">← Back</button>
              <h1 className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white">Where is it?</h1>
              <p className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">Search or tap the map to repin</p>
            </div>

            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600 pointer-events-none" size={14} />
                  <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Society name, landmark, area…"
                    className="w-full pl-9 pr-4 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white" />
                  {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin" size={13} />}
                </div>
                <button type="button" onClick={useMyLocation} disabled={locating} title="Use my location"
                  className="flex items-center justify-center w-11 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 rounded-xl transition-colors shrink-0">
                  {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-[2000] top-full mt-1 w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xl">
                  {searchResults.map(r => (
                    <button key={r.place_id} type="button" onClick={() => selectResult(r)}
                      className="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors">
                      <p className="text-sm font-medium text-neutral-950 dark:text-white truncate">{r.display_name.split(',')[0]}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-600 truncate mt-0.5">{r.display_name.split(',').slice(1, 3).join(',')}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={`rounded-2xl overflow-hidden border transition-colors ${pickedLocation ? 'border-neutral-950 dark:border-white' : 'border-neutral-200 dark:border-neutral-800'}`} style={{ height: 340 }}>
              <ListingsMap
                listings={pickedLocation ? [{ id: 'preview', lat: pickedLocation.lat, lng: pickedLocation.lng, rent_amount: rent || 0, title: autoTitle() }] : []}
                onMapClick={handleMapClick}
                pickMode
                center={locCenter}
                zoom={locZoom}
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

        {/* Step 3 */}
        {step === 3 && (
          <div className="fade-up space-y-6">
            <div>
              <button type="button" onClick={() => setStep(2)} className="text-xs text-neutral-400 dark:text-neutral-600 hover:text-neutral-950 dark:hover:text-white mb-4 flex items-center gap-1 transition-colors">← Back</button>
              <h1 className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white">Contact & Photos</h1>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Your mobile number</p>
              <div className={`flex items-center border rounded-xl overflow-hidden focus-within:ring-1 transition-colors ${phoneError ? 'border-red-400 focus-within:ring-red-400' : 'border-neutral-200 dark:border-neutral-800 focus-within:ring-neutral-950 dark:focus-within:ring-white'}`}>
                <span className="pl-4 pr-2 text-neutral-400 dark:text-neutral-600 text-sm font-medium bg-neutral-50 dark:bg-neutral-900 py-3.5 border-r border-neutral-200 dark:border-neutral-800">+91</span>
                <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneError('') }} placeholder="98765 43210"
                  className="flex-1 px-4 py-3.5 text-sm text-neutral-950 dark:text-white placeholder-neutral-300 dark:placeholder-neutral-700 bg-white dark:bg-black focus:outline-none" />
              </div>
              {phoneError && <p className="text-red-500 text-xs mt-1.5">{phoneError}</p>}
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-3">Photos</p>

              {/* Existing + new images grid */}
              {(existingImages.length > 0 || newImages.length > 0) && (
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {existingImages.map((url, i) => (
                    <div key={`e-${i}`} className="relative group rounded-lg overflow-hidden aspect-square bg-neutral-100 dark:bg-neutral-900">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeExisting(i)} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                      {i === 0 && newImages.length === 0 && <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">Cover</span>}
                    </div>
                  ))}
                  {newImages.map((img, i) => (
                    <div key={`n-${i}`} className="relative group rounded-lg overflow-hidden aspect-square bg-neutral-100 dark:bg-neutral-900">
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeNew(i)} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                      {existingImages.length === 0 && i === 0 && <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">Cover</span>}
                    </div>
                  ))}
                </div>
              )}

              {existingImages.length + newImages.length < 8 && (
                <div
                  className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-6 text-center hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addImages(e.dataTransfer.files) }}
                  onClick={() => document.getElementById('img-input-edit').click()}
                >
                  <Upload className="mx-auto text-neutral-300 dark:text-neutral-700 mb-2" size={22} />
                  <p className="text-sm text-neutral-500 dark:text-neutral-500">
                    Drop photos or <span className="text-neutral-950 dark:text-white font-medium">click to upload</span>
                  </p>
                  <input id="img-input-edit" type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
                </div>
              )}
            </div>

            <div className="border-t border-neutral-100 dark:border-neutral-900 pt-4">
              <button type="button" onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors">
                <ChevronDown size={14} className={`transition-transform ${showOptional ? 'rotate-180' : ''}`} />
                {showOptional ? 'Hide' : 'Edit'} description & availability
              </button>
              {showOptional && (
                <div className="mt-4 space-y-4 fade-up">
                  <div>
                    <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-2">Description</p>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                      placeholder="Describe the property, nearby landmarks, metro access…"
                      className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white resize-none" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-400 dark:text-neutral-600 uppercase tracking-wider mb-2">Available from</p>
                    <input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)}
                      className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-950 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-950 dark:focus:ring-white" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400 truncate">{autoTitle()}</span>
              <span className="font-[Bricolage_Grotesque] font-bold text-neutral-950 dark:text-white shrink-0 ml-3">
                ₹{Number(rent).toLocaleString('en-IN')}/mo
              </span>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="button" onClick={save} disabled={uploading}
              className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-60 text-white dark:text-black font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
              {uploading && <Loader2 size={14} className="animate-spin" />}
              {uploading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
