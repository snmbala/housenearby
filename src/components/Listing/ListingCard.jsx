import { useNavigate } from 'react-router-dom'
import { MapPin, BedDouble } from 'lucide-react'

const BHK_LABELS = { 0: 'Studio', 1: '1 BHK', 2: '2 BHK', 3: '3 BHK', 4: '4+ BHK' }

const FURNISHING_LABELS = {
  furnished: 'Furnished',
  semi: 'Semi',
  unfurnished: 'Unfurnished',
}

export default function ListingCard({ listing }) {
  const navigate = useNavigate()
  const thumb = listing.images?.[0]

  return (
    <div
      onClick={() => navigate(`/listing/${listing.id}`)}
      className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer overflow-hidden group"
    >
      <div className="h-36 bg-neutral-100 dark:bg-neutral-900 relative overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-700 text-3xl">🏠</div>
        )}
        <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
          {FURNISHING_LABELS[listing.furnishing] ?? listing.furnishing}
        </span>
      </div>

      <div className="p-3">
        <p className="font-[Bricolage_Grotesque] font-semibold text-neutral-950 dark:text-white truncate text-sm leading-snug">{listing.title}</p>
        <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-600 text-xs mt-1">
          <MapPin size={10} />
          <span className="truncate">{listing.city}, {listing.state}</span>
        </div>

        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
          <span className="font-[Bricolage_Grotesque] font-bold text-neutral-950 dark:text-white text-sm tracking-tight">
            ₹{Number(listing.rent_amount).toLocaleString('en-IN')}
            <span className="font-normal text-neutral-400 dark:text-neutral-600 text-xs">/mo</span>
          </span>
          <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-600 text-xs">
            <BedDouble size={11} />
            <span>{BHK_LABELS[listing.bhk] ?? `${listing.bhk} BHK`}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
