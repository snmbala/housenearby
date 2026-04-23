import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MapPin, BedDouble, Phone, Mail, Shield, Loader2, Share2,
  ChevronLeft, ChevronRight, X, MessageSquare,
  Zap, Wifi, Car, Dumbbell, Waves, Trees, ShieldCheck,
  Droplets, Wind, PawPrint, Building2, Users, Wrench,
  PhoneCall, Calendar, Home, ArrowLeft,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import ListingsMap from '../components/Map/ListingsMap'
import AuthModal from '../components/Auth/AuthModal'
import SEOMeta from '../components/SEOMeta.jsx'

const BHK_LABELS    = { 0: 'Studio', 1: '1 BHK', 2: '2 BHK', 3: '3 BHK', 4: '4+ BHK' }
const FURNISH_LABELS = { furnished: 'Furnished', semi: 'Semi-furnished', unfurnished: 'Unfurnished' }
const PREFERRED_LABELS = { any: 'Anyone', family: 'Family', bachelor: 'Bachelors', working: 'Working Professionals' }

const AMENITY_META = {
  parking_2w:    { label: '2-Wheeler Parking', icon: <Car size={18} /> },
  parking_4w:    { label: '4-Wheeler Parking', icon: <Car size={18} /> },
  lift:          { label: 'Lift / Elevator',   icon: <Building2 size={18} /> },
  power_backup:  { label: 'Power Backup',       icon: <Zap size={18} /> },
  security:      { label: 'Security / CCTV',    icon: <ShieldCheck size={18} /> },
  gym:           { label: 'Gym',                icon: <Dumbbell size={18} /> },
  swimming_pool: { label: 'Swimming Pool',      icon: <Waves size={18} /> },
  clubhouse:     { label: 'Club House',         icon: <Building2 size={18} /> },
  garden:        { label: 'Garden / Park',      icon: <Trees size={18} /> },
  wifi:          { label: 'Wi-Fi',              icon: <Wifi size={18} /> },
  gated:         { label: 'Gated Community',    icon: <Shield size={18} /> },
  intercom:      { label: 'Intercom',           icon: <PhoneCall size={18} /> },
  water_24x7:    { label: 'Water 24×7',        icon: <Droplets size={18} /> },
  balcony:       { label: 'Balcony',            icon: <Trees size={18} /> },
  pet_friendly:  { label: 'Pet Friendly',       icon: <PawPrint size={18} /> },
  ac:            { label: 'Air Conditioning',   icon: <Wind size={18} /> },
}

function Divider() {
  return <hr className="border-neutral-200 dark:border-neutral-800" />
}

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [listing, setListing]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [lightbox, setLightbox]           = useState(false)
  const [lightboxIdx, setLightboxIdx]     = useState(0)
  const [showAllPhotos, setShowAllPhotos] = useState(false)
  const [contactRevealed, setContactRevealed] = useState(false)
  const [revealLoading, setRevealLoading] = useState(false)
  const [contactCooldown, setContactCooldown] = useState(false)
  const [msgLoading, setMsgLoading]       = useState(false)
  const [showAuth, setShowAuth]           = useState(false)
  const [showAllAmenities, setShowAllAmenities] = useState(false)
  const [copied, setCopied]               = useState(false)

  useEffect(() => {
    supabase.from('listings').select('*').eq('id', id).single()
      .then(({ data }) => { setListing(data); setLoading(false) })
  }, [id])

  const handleRevealContact = async () => {
    if (!user) { setShowAuth(true); return }
    setRevealLoading(true)
    const since = new Date(Date.now() - 86400000).toISOString()
    const { count } = await supabase
      .from('contact_requests').select('id', { count: 'exact', head: true })
      .eq('listing_id', id).eq('requester_id', user.id).gte('created_at', since)
    if (count > 0) { setContactCooldown(true); setRevealLoading(false); return }
    await supabase.from('contact_requests').insert({ listing_id: id, requester_id: user.id, requester_email: user.email })
    setRevealLoading(false)
    setContactRevealed(true)
  }

  const handleMessage = async () => {
    if (!user) { setShowAuth(true); return }
    setMsgLoading(true)
    const { data, error } = await supabase.from('conversations')
      .upsert({ listing_id: listing.id, requester_id: user.id, owner_id: listing.user_id }, { onConflict: 'listing_id,requester_id' })
      .select('id').single()
    setMsgLoading(false)
    if (error || !data) { alert('Could not start conversation. Please try again.'); return }
    navigate(`/messages?c=${data.id}`)
  }

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openLightbox = (i) => { setLightboxIdx(i); setLightbox(true) }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
      <Loader2 className="animate-spin text-neutral-400" size={28} />
    </div>
  )

  if (!listing) return (
    <div className="text-center py-24 bg-white dark:bg-black min-h-screen">
      <p className="text-neutral-400">Listing not found</p>
      <button onClick={() => navigate('/')} className="mt-4 text-sm underline text-neutral-950 dark:text-white">Back to home</button>
    </div>
  )

  const images    = listing.images ?? []
  const amenities = listing.amenities ?? []
  const isOwner   = user?.id === listing.user_id
  const visibleAmenities = showAllAmenities ? amenities : amenities.slice(0, 8)
  const postedDate = new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const ownerInitial = (listing.contact_name ?? listing.contact_email ?? 'O')[0].toUpperCase()

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'RealEstateListing',
    name: listing.title, description: listing.description ?? listing.title,
    image: images[0], url: window.location.href,
    address: { '@type': 'PostalAddress', addressLocality: listing.city, addressRegion: listing.state, postalCode: listing.pincode, addressCountry: 'IN' },
    offers: { '@type': 'Offer', price: listing.rent_amount, priceCurrency: 'INR' },
  }

  return (
    <>
      <SEOMeta
        title={listing.title}
        description={`${listing.title} in ${listing.city}. ₹${Number(listing.rent_amount).toLocaleString('en-IN')}/month. ${listing.description ?? ''}`}
        image={images[0]}
        jsonLd={jsonLd}
      />

      <div className="bg-white dark:bg-black min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

          {/* ── Title row ── */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <button
                onClick={() => window.opener ? window.close() : navigate(-1)}
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-3 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <h1 className="font-[Bricolage_Grotesque] text-2xl sm:text-3xl font-bold text-neutral-950 dark:text-white leading-tight">
                {listing.title}
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5 text-neutral-500 dark:text-neutral-500 text-sm">
                <MapPin size={13} className="shrink-0" />
                <span>{[listing.address, listing.city, listing.state].filter(Boolean).join(', ')}</span>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors shrink-0 mt-9"
            >
              <Share2 size={14} />
              {copied ? 'Copied!' : 'Share'}
            </button>
          </div>

          {/* ── Photo grid ── */}
          <div className="relative rounded-2xl overflow-hidden mb-8">
            {images.length === 0 ? (
              <div className="h-[420px] bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-6xl">🏠</div>
            ) : images.length === 1 ? (
              <img src={images[0]} alt="" className="w-full h-[420px] object-cover cursor-zoom-in" onClick={() => openLightbox(0)} />
            ) : (
              <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-[420px]">
                {/* Main large photo */}
                <div className="col-span-2 row-span-2 cursor-zoom-in overflow-hidden rounded-l-2xl" onClick={() => openLightbox(0)}>
                  <img src={images[0]} alt="" className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300" />
                </div>
                {/* 4 smaller photos */}
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`overflow-hidden cursor-zoom-in relative ${i === 2 ? 'rounded-tr-2xl' : ''} ${i === 4 ? 'rounded-br-2xl' : ''}`}
                    onClick={() => openLightbox(images[i] ? i : 0)}
                  >
                    {images[i] ? (
                      <>
                        <img src={images[i]} alt="" className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300" />
                        {i === 4 && images.length > 5 && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">+{images.length - 5} photos</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full bg-neutral-100 dark:bg-neutral-900" />
                    )}
                  </div>
                ))}
              </div>
            )}
            {images.length > 1 && (
              <button
                onClick={() => openLightbox(0)}
                className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 px-3.5 py-2 rounded-xl text-sm font-medium text-neutral-950 dark:text-white shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              >
                Show all photos
              </button>
            )}
          </div>

          {/* ── Two-column layout ── */}
          <div className="flex gap-12">

            {/* ── Left column ── */}
            <div className="flex-1 min-w-0 space-y-8">

              {/* Property headline */}
              <div>
                <h2 className="font-[Bricolage_Grotesque] text-xl font-bold text-neutral-950 dark:text-white">
                  {BHK_LABELS[listing.bhk] ?? `${listing.bhk} BHK`} ·{' '}
                  {listing.property_type?.charAt(0).toUpperCase() + listing.property_type?.slice(1)} ·{' '}
                  {FURNISH_LABELS[listing.furnishing] ?? listing.furnishing}
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-neutral-500 dark:text-neutral-500 text-sm">
                  {listing.preferred_tenants && listing.preferred_tenants !== 'any' && (
                    <span>Preferred: {PREFERRED_LABELS[listing.preferred_tenants]}</span>
                  )}
                  {listing.available_from && (
                    <span>Available from {new Date(listing.available_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                  {listing.pincode && <span>Pincode {listing.pincode}</span>}
                </div>
              </div>

              <Divider />

              {/* Owner / posted by */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-neutral-950 dark:bg-white flex items-center justify-center shrink-0">
                  <span className="text-white dark:text-black font-[Bricolage_Grotesque] font-bold text-lg">{ownerInitial}</span>
                </div>
                <div>
                  <p className="font-semibold text-neutral-950 dark:text-white text-sm">
                    Listed by {listing.contact_name || 'Owner'}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600">Posted on {postedDate}</p>
                </div>
              </div>

              <Divider />

              {/* Highlights */}
              <div className="space-y-4">
                {listing.maintenance_included === true && (
                  <HighlightRow icon={<Wrench size={20} />} title="Maintenance included" sub="No extra charges — all maintenance costs are covered in the rent" />
                )}
                {listing.maintenance_included === false && listing.maintenance_amount && (
                  <HighlightRow icon={<Wrench size={20} />} title={`₹${Number(listing.maintenance_amount).toLocaleString('en-IN')}/month maintenance`} sub="Charged separately from rent" />
                )}
                {listing.furnishing === 'furnished' && (
                  <HighlightRow icon={<Home size={20} />} title="Fully furnished" sub="Move in right away — all furniture and appliances included" />
                )}
                {listing.furnishing === 'semi' && (
                  <HighlightRow icon={<Home size={20} />} title="Semi-furnished" sub="Basic furniture provided — add your own touches" />
                )}
                {listing.preferred_tenants && listing.preferred_tenants !== 'any' && (
                  <HighlightRow icon={<Users size={20} />} title={`Preferred for ${PREFERRED_LABELS[listing.preferred_tenants]}`} sub="Owner has a preference on tenant type" />
                )}
                {amenities.includes('gated') && (
                  <HighlightRow icon={<ShieldCheck size={20} />} title="Gated community" sub="Secure, controlled access with security personnel" />
                )}
              </div>

              <Divider />

              {/* Description */}
              {listing.description && (
                <>
                  <div>
                    <h3 className="font-[Bricolage_Grotesque] text-lg font-bold text-neutral-950 dark:text-white mb-3">About this property</h3>
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-line">{listing.description}</p>
                  </div>
                  <Divider />
                </>
              )}

              {/* Amenities */}
              {amenities.length > 0 && (
                <>
                  <div>
                    <h3 className="font-[Bricolage_Grotesque] text-lg font-bold text-neutral-950 dark:text-white mb-5">What this place offers</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {visibleAmenities.map(a => {
                        const meta = AMENITY_META[a]
                        return (
                          <div key={a} className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                            <span className="text-neutral-500 dark:text-neutral-500 shrink-0">{meta?.icon ?? <Home size={18} />}</span>
                            <span className="text-sm">{meta?.label ?? a}</span>
                          </div>
                        )
                      })}
                    </div>
                    {amenities.length > 8 && (
                      <button
                        onClick={() => setShowAllAmenities(v => !v)}
                        className="mt-5 px-5 py-2.5 border border-neutral-950 dark:border-white rounded-xl text-sm font-medium text-neutral-950 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                      >
                        {showAllAmenities ? 'Show less' : `Show all ${amenities.length} amenities`}
                      </button>
                    )}
                  </div>
                  <Divider />
                </>
              )}

              {/* Map */}
              <div>
                <h3 className="font-[Bricolage_Grotesque] text-lg font-bold text-neutral-950 dark:text-white mb-1">Where you'll be</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-4">
                  {[listing.city, listing.state].filter(Boolean).join(', ')}
                </p>
                <div className="h-72 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                  <ListingsMap listings={[listing]} center={[listing.lat, listing.lng]} zoom={15} />
                </div>
              </div>

              <Divider />

              {/* Owner card */}
              <div>
                <h3 className="font-[Bricolage_Grotesque] text-lg font-bold text-neutral-950 dark:text-white mb-5">Meet the owner</h3>
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 rounded-full bg-neutral-950 dark:bg-white flex items-center justify-center shrink-0">
                    <span className="text-white dark:text-black font-[Bricolage_Grotesque] font-bold text-2xl">{ownerInitial}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-[Bricolage_Grotesque] font-bold text-neutral-950 dark:text-white text-lg">{listing.contact_name || 'Owner'}</p>
                    <p className="text-sm text-neutral-400 dark:text-neutral-600 mt-0.5">Listed on {postedDate}</p>
                    <div className="mt-4 space-y-2 text-sm text-neutral-500 dark:text-neutral-500">
                      <p className="flex items-center gap-2"><BedDouble size={14} /> {BHK_LABELS[listing.bhk]} {listing.property_type} for rent</p>
                      {listing.city && <p className="flex items-center gap-2"><MapPin size={14} /> {listing.city}, {listing.state}</p>}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-600 flex items-center gap-1.5">
                  <Shield size={12} /> To protect your interest, always communicate before sharing personal details.
                </p>
              </div>

              <Divider />

              {/* Things to know */}
              <div>
                <h3 className="font-[Bricolage_Grotesque] text-lg font-bold text-neutral-950 dark:text-white mb-5">Things to know</h3>
                <div className="grid sm:grid-cols-3 gap-6 text-sm">
                  <div>
                    <p className="font-semibold text-neutral-950 dark:text-white mb-2">Rental terms</p>
                    <ul className="space-y-1 text-neutral-500 dark:text-neutral-500">
                      <li>Monthly rent: ₹{Number(listing.rent_amount).toLocaleString('en-IN')}</li>
                      {listing.deposit_amount && <li>Security deposit: ₹{Number(listing.deposit_amount).toLocaleString('en-IN')}</li>}
                      <li>{listing.maintenance_included ? 'Maintenance included' : 'Maintenance extra'}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-950 dark:text-white mb-2">Property rules</p>
                    <ul className="space-y-1 text-neutral-500 dark:text-neutral-500">
                      <li>Preferred: {PREFERRED_LABELS[listing.preferred_tenants] ?? 'Anyone'}</li>
                      <li>{amenities.includes('pet_friendly') ? 'Pets allowed' : 'No pets'}</li>
                      {listing.available_from && <li>Available from {new Date(listing.available_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-950 dark:text-white mb-2">Safety</p>
                    <ul className="space-y-1 text-neutral-500 dark:text-neutral-500">
                      {amenities.includes('security') && <li>Security / CCTV</li>}
                      {amenities.includes('gated') && <li>Gated community</li>}
                      {amenities.includes('intercom') && <li>Intercom</li>}
                      {!amenities.some(a => ['security','gated','intercom'].includes(a)) && <li>Contact owner for details</li>}
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            {/* ── Right sticky card ── */}
            <div className="hidden lg:block w-[380px] shrink-0">
              <div className="sticky top-6">
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-lg dark:shadow-black/40 p-6 space-y-5">

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white">
                      ₹{Number(listing.rent_amount).toLocaleString('en-IN')}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-500 text-sm">/ month</span>
                  </div>

                  {/* Key specs */}
                  <div className="grid grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden text-sm">
                    {[
                      { label: 'TYPE', value: listing.property_type?.charAt(0).toUpperCase() + listing.property_type?.slice(1) },
                      { label: 'SIZE', value: BHK_LABELS[listing.bhk] ?? `${listing.bhk} BHK` },
                      { label: 'FURNISHING', value: FURNISH_LABELS[listing.furnishing] ?? listing.furnishing },
                      { label: 'DEPOSIT', value: listing.deposit_amount ? `₹${Number(listing.deposit_amount).toLocaleString('en-IN')}` : 'Negotiable' },
                    ].map(s => (
                      <div key={s.label} className="bg-white dark:bg-black px-3.5 py-3">
                        <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 tracking-wider">{s.label}</p>
                        <p className="text-neutral-950 dark:text-white font-medium mt-0.5 truncate">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {isOwner ? (
                    <p className="text-sm text-neutral-400 dark:text-neutral-600 italic text-center py-1">This is your listing</p>
                  ) : contactCooldown ? (
                    <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-500 text-sm px-4 py-3 rounded-xl text-center">
                      Already contacted in the last 24 hours
                    </div>
                  ) : contactRevealed ? (
                    <div className="space-y-3">
                      <a href={`tel:+91${listing.contact_phone}`}
                        className="w-full bg-neutral-950 dark:bg-white text-white dark:text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors">
                        <Phone size={15} /> +91 {listing.contact_phone}
                      </a>
                      {listing.contact_email && (
                        <a href={`mailto:${listing.contact_email}`}
                          className="w-full border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
                          <Mail size={15} /> {listing.contact_email}
                        </a>
                      )}
                      <button onClick={handleMessage} disabled={msgLoading}
                        className="w-full border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50">
                        {msgLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                        Message owner
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button onClick={handleRevealContact} disabled={revealLoading}
                        className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-60 text-white dark:text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
                        {revealLoading ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                        {user ? 'Reveal contact' : 'Sign in to contact'}
                      </button>
                      <button onClick={handleMessage} disabled={msgLoading}
                        className="w-full border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors disabled:opacity-50">
                        {msgLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                        Message owner
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-600 justify-center">
                    <Shield size={11} /> Don't share personal info before verifying the listing
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Mobile sticky contact bar ── */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center gap-3 z-[100]">
            <div className="flex-1">
              <p className="font-[Bricolage_Grotesque] font-bold text-neutral-950 dark:text-white">
                ₹{Number(listing.rent_amount).toLocaleString('en-IN')}
                <span className="font-normal text-neutral-400 dark:text-neutral-600 text-xs">/mo</span>
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-600">{BHK_LABELS[listing.bhk]} · {listing.city}</p>
            </div>
            {!isOwner && (
              contactRevealed ? (
                <a href={`tel:+91${listing.contact_phone}`}
                  className="bg-neutral-950 dark:bg-white text-white dark:text-black font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  <Phone size={14} /> Call now
                </a>
              ) : (
                <button onClick={handleRevealContact} disabled={revealLoading}
                  className="bg-neutral-950 dark:bg-white text-white dark:text-black font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 disabled:opacity-60">
                  {revealLoading ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                  {user ? 'Contact owner' : 'Sign in'}
                </button>
              )
            )}
          </div>

        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && images.length > 0 && (
        <div className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white p-2 z-10 transition-colors" onClick={() => setLightbox(false)}>
            <X size={22} />
          </button>
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm tabular-nums">{lightboxIdx + 1} / {images.length}</span>
          {lightboxIdx > 0 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 z-10 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i - 1) }}>
              <ChevronLeft size={30} />
            </button>
          )}
          {lightboxIdx < images.length - 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 z-10 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i + 1) }}>
              <ChevronRight size={30} />
            </button>
          )}
          <img src={images[lightboxIdx]} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}

function HighlightRow({ icon, title, sub }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-neutral-950 dark:text-white shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-neutral-950 dark:text-white">{title}</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-0.5">{sub}</p>
      </div>
    </div>
  )
}
