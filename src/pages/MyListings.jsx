import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Eye, EyeOff, Trash2, Loader2, MessageSquare, Pencil } from 'lucide-react'
import SEOMeta from '../components/SEOMeta.jsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth.jsx'
import { listingUrl } from '../lib/listing'

export default function MyListings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [contactCounts, setContactCounts] = useState({})

  useEffect(() => {
    if (user) fetchMyListings()
  }, [user])

  const fetchMyListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setListings(data ?? [])
    setLoading(false)

    if (data?.length) {
      const ids = data.map(l => l.id)
      const { data: counts } = await supabase
        .from('contact_requests')
        .select('listing_id')
        .in('listing_id', ids)

      const countMap = {}
      counts?.forEach(r => {
        countMap[r.listing_id] = (countMap[r.listing_id] ?? 0) + 1
      })
      setContactCounts(countMap)
    }
  }

  const toggleActive = async (id, current) => {
    await supabase.from('listings').update({ is_active: !current }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active: !current } : l))
  }

  const deleteListing = async (id) => {
    if (!confirm('Delete this listing permanently?')) return
    await supabase.from('listings').delete().eq('id', id)
    setListings(prev => prev.filter(l => l.id !== id))
  }

  if (!user) {
    return (
      <div className="text-center py-24 bg-white dark:bg-black min-h-screen">
        <p className="text-neutral-400 dark:text-neutral-600 text-sm">Sign in to manage your listings</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-black">
        <Loader2 className="animate-spin text-neutral-400" size={28} />
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen">
      <SEOMeta title="My Listings" description="Manage your rental listings on HouseNearby." />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="font-[Bricolage_Grotesque] text-2xl font-bold text-neutral-950 dark:text-white">My Listings</h1>
            <p className="text-neutral-400 dark:text-neutral-600 text-xs mt-0.5">
              {listings.length} listing{listings.length !== 1 ? 's' : ''} · max 3 active
            </p>
          </div>
          <button
            onClick={() => navigate('/post')}
            className="flex items-center gap-1.5 bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-black text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <PlusCircle size={14} /> New listing
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-3xl mb-3">🏠</p>
            <p className="font-medium text-neutral-700 dark:text-neutral-300 text-sm">No listings yet</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1 mb-5">Post your first property and get tenants directly</p>
            <button
              onClick={() => navigate('/post')}
              className="bg-neutral-950 dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 text-sm font-medium transition-colors"
            >
              Post a rental
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {listings.map(listing => (
              <div
                key={listing.id}
                className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center gap-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="w-16 h-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 shrink-0 border border-neutral-200 dark:border-neutral-800">
                  {listing.images?.[0] ? (
                    <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-700 text-lg">🏠</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-[Bricolage_Grotesque] font-semibold text-neutral-950 dark:text-white truncate text-sm">{listing.title}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-0.5">{listing.city}, {listing.state}</p>
                  <p className="text-xs font-semibold text-neutral-950 dark:text-white mt-0.5">₹{Number(listing.rent_amount).toLocaleString('en-IN')}/mo</p>
                </div>

                <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-600 text-xs shrink-0">
                  <MessageSquare size={12} />
                  <span>{contactCounts[listing.id] ?? 0}</span>
                </div>

                <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                  listing.is_active
                    ? 'bg-neutral-950 dark:bg-white text-white dark:text-black'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 border border-neutral-200 dark:border-neutral-800'
                }`}>
                  {listing.is_active ? 'Active' : 'Off'}
                </span>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => navigate(listingUrl(listing))}
                    className="p-2 text-neutral-400 dark:text-neutral-600 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors"
                    title="View"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => navigate(`/edit/${listing.id}`)}
                    className="p-2 text-neutral-400 dark:text-neutral-600 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(listing.id, listing.is_active)}
                    className="p-2 text-neutral-400 dark:text-neutral-600 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors"
                    title={listing.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {listing.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => deleteListing(listing.id)}
                    className="p-2 text-neutral-400 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
