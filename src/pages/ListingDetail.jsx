import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, BedDouble, IndianRupee, Phone, Mail, Calendar, ArrowLeft, Shield, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import ListingsMap from '../components/Map/ListingsMap'
import AuthModal from '../components/Auth/AuthModal'

const BHK_LABELS = { 0: 'Studio', 1: '1 BHK', 2: '2 BHK', 3: '3 BHK', 4: '4+ BHK' }

export default function ListingDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [contactRevealed, setContactRevealed] = useState(false)
  const [revealLoading, setRevealLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [contactCooldown, setContactCooldown] = useState(false)

  useEffect(() => { fetchListing() }, [id])

  const fetchListing = async () => {
    const { data } = await supabase.from('listings').select('*').eq('id', id).single()
    setListing(data)
    setLoading(false)
  }

  const handleRevealContact = async () => {
    if (!user) { setShowAuth(true); return }
    setRevealLoading(true)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('contact_requests')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', id)
      .eq('requester_id', user.id)
      .gte('created_at', since)
    if (count > 0) { setContactCooldown(true); setRevealLoading(false); return }
    await supabase.from('contact_requests').insert({
      listing_id: id, requester_id: user.id, requester_email: user.email,
    })
    setRevealLoading(false)
    setContactRevealed(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-black">
        <Loader2 className="animate-spin text-neutral-400" size={28} />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="text-center py-24 bg-white dark:bg-black">
        <p className="text-neutral-400 text-base">Listing not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-neutral-950 dark:text-white underline text-sm">Back to home</button>
      </div>
    )
  }

  const isOwner = user?.id === listing.user_id

  return (
    <>
      <div className="bg-white dark:bg-black min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-600 hover:text-neutral-950 dark:hover:text-white mb-5 text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left: Images + details */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 aspect-video mb-3 border border-neutral-200 dark:border-neutral-800">
                {listing.images?.length > 0 ? (
                  <img src={listing.images[activeImg]} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-700 text-5xl">🏠</div>
                )}
              </div>

              {listing.images?.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {listing.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${
                        activeImg === i
                          ? 'border-neutral-950 dark:border-white'
                          : 'border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <h1 className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white leading-tight">{listing.title}</h1>
                <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-500 mt-1.5">
                  <MapPin size={13} />
                  <span className="text-sm">{listing.address}, {listing.city}, {listing.state} {listing.pincode}</span>
                </div>

                <div className="flex flex-wrap gap-2 mt-5">
                  <Tag icon={<IndianRupee size={12} />} label={`₹${Number(listing.rent_amount).toLocaleString('en-IN')}/month`} primary />
                  {listing.deposit_amount && (
                    <Tag label={`₹${Number(listing.deposit_amount).toLocaleString('en-IN')} deposit`} />
                  )}
                  <Tag icon={<BedDouble size={12} />} label={BHK_LABELS[listing.bhk] ?? `${listing.bhk} BHK`} />
                  <Tag label={listing.property_type?.charAt(0).toUpperCase() + listing.property_type?.slice(1)} />
                  <Tag label={listing.furnishing === 'semi' ? 'Semi-furnished' : listing.furnishing?.charAt(0).toUpperCase() + listing.furnishing?.slice(1)} />
                  {listing.available_from && (
                    <Tag icon={<Calendar size={12} />} label={`Available ${new Date(listing.available_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`} />
                  )}
                </div>

                {listing.description && (
                  <div className="mt-6">
                    <h3 className="font-[Bricolage_Grotesque] font-semibold text-neutral-950 dark:text-white mb-2 text-sm uppercase tracking-wide">About this property</h3>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed whitespace-pre-line">{listing.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Map + Contact */}
            <div className="lg:col-span-2 space-y-4">
              <div className="h-48 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <ListingsMap listings={[listing]} center={[listing.lat, listing.lng]} zoom={15} />
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <h3 className="font-[Bricolage_Grotesque] font-semibold text-neutral-950 dark:text-white mb-4 text-sm">Contact owner</h3>

                {isOwner ? (
                  <p className="text-sm text-neutral-400 dark:text-neutral-600 italic">This is your listing</p>
                ) : contactCooldown ? (
                  <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-sm px-4 py-3 rounded-xl">
                    You've already contacted this owner in the last 24 hours.
                  </div>
                ) : contactRevealed ? (
                  <div className="space-y-3">
                    <ContactRow icon={<Phone size={14} />} label={`+91 ${listing.contact_phone}`} href={`tel:+91${listing.contact_phone}`} />
                    {listing.contact_email && (
                      <ContactRow icon={<Mail size={14} />} label={listing.contact_email} href={`mailto:${listing.contact_email}`} />
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-600 mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                      <Shield size={11} />
                      <span>Don't share this contact publicly</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-4">Sign in to reveal the owner's contact</p>
                    <button
                      onClick={handleRevealContact}
                      disabled={revealLoading}
                      className="w-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:opacity-60 text-white dark:text-black font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      {revealLoading ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                      {user ? 'Reveal contact' : 'Sign in to contact'}
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-neutral-300 dark:text-neutral-700 text-center">
                Posted {new Date(listing.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}

function Tag({ icon, label, primary }) {
  return (
    <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
      primary
        ? 'bg-neutral-950 dark:bg-white text-white dark:text-black font-[Bricolage_Grotesque]'
        : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800'
    }`}>
      {icon}{label}
    </span>
  )
}

function ContactRow({ icon, label, href }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors"
    >
      <span className="text-neutral-400 dark:text-neutral-600">{icon}</span>
      <span>{label}</span>
    </a>
  )
}
