import { MapPin, BedDouble } from 'lucide-react'
import { BHK_LABELS, FURNISHING_LABELS, fmtDist } from '../../lib/listing'

export default function MobileCard({ listing, distKm, onTap }) {
  const images = listing.images?.slice(0, 3) ?? []
  const distLabel = fmtDist(distKm)

  return (
    <div
      className="snap-center shrink-0 w-[82vw] bg-neutral-50 dark:bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-200/60 dark:border-neutral-800 active:scale-[0.97] transition-transform"
      onClick={onTap}
    >
      {/* Image grid */}
      <div className="h-48 flex gap-0.5 overflow-hidden">
        {images.length === 0 && (
          <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-3xl">🏠</div>
        )}
        {images.length === 1 && (
          <div className="relative w-full h-full">
            <img src={images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
            <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/55 text-white backdrop-blur-sm">
              {FURNISHING_LABELS[listing.furnishing] ?? listing.furnishing}
            </span>
          </div>
        )}
        {images.length === 2 && (
          <>
            <div className="relative w-1/2 h-full">
              <img src={images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/55 text-white backdrop-blur-sm">
                {FURNISHING_LABELS[listing.furnishing] ?? listing.furnishing}
              </span>
            </div>
            <div className="w-1/2 h-full">
              <img src={images[1]} alt="" loading="lazy" className="w-full h-full object-cover" />
            </div>
          </>
        )}
        {images.length >= 3 && (
          <>
            <div className="relative w-3/5 h-full">
              <img src={images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/55 text-white backdrop-blur-sm">
                {FURNISHING_LABELS[listing.furnishing] ?? listing.furnishing}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 w-2/5 h-full">
              <img src={images[1]} alt="" loading="lazy" className="w-full h-1/2 object-cover" />
              <div className="relative w-full h-1/2">
                <img src={images[2]} alt="" loading="lazy" className="w-full h-full object-cover" />
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
            {distLabel && <span>{distLabel}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
