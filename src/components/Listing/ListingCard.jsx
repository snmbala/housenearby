import { useState } from 'react'
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { BHK_LABELS, FURNISHING_LABELS, fmtDist } from '../../lib/listing'

export default function ListingCard({ listing, distKm, onHover }) {
  const [imgIdx, setImgIdx] = useState(0)
  const images = listing.images ?? []
  const handleClick = () => window.open(`/listing/${listing.id}`, '_blank')

  const prev = (e) => { e.stopPropagation(); setImgIdx(i => Math.max(0, i - 1)) }
  const next = (e) => { e.stopPropagation(); setImgIdx(i => Math.min(images.length - 1, i + 1)) }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
      className="group bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:shadow-md dark:hover:shadow-black/40 transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Image slider */}
      <div className="relative h-48 bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
        {images.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-4xl select-none">🏠</div>
        ) : (
          <>
            <img
              key={imgIdx}
              src={images[imgIdx]}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />

            {/* Furnishing badge */}
            {listing.furnishing && (
              <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                {FURNISHING_LABELS[listing.furnishing] ?? listing.furnishing}
              </span>
            )}

            {/* Distance badge */}
            {fmtDist(distKm) && (
              <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                {fmtDist(distKm)}
              </span>
            )}

            {/* Prev / Next arrows — show on hover */}
            {imgIdx > 0 && (
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-neutral-900 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft size={16} className="text-neutral-800 dark:text-white" />
              </button>
            )}
            {imgIdx < images.length - 1 && (
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-neutral-900 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight size={16} className="text-neutral-800 dark:text-white" />
              </button>
            )}

            {/* Dot indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                {images.slice(0, 8).map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setImgIdx(i) }}
                    className={`rounded-full transition-all duration-200 ${
                      i === imgIdx
                        ? 'w-3 h-1.5 bg-white'
                        : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-[Bricolage_Grotesque] font-bold text-neutral-950 dark:text-white text-base leading-tight">
            ₹{Number(listing.rent_amount).toLocaleString('en-IN')}
            <span className="font-normal text-neutral-400 dark:text-neutral-600 text-xs">/mo</span>
          </p>
          <span className="text-xs text-neutral-400 dark:text-neutral-600 bg-neutral-100 dark:bg-neutral-900 px-2 py-0.5 rounded-full shrink-0">
            {listing.property_type ?? 'Rental'}
          </span>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1.5">
          {BHK_LABELS[listing.bhk] ?? `${listing.bhk} BHK`}
          {listing.furnishing && <span className="text-neutral-400 dark:text-neutral-600"> · {FURNISHING_LABELS[listing.furnishing] ?? listing.furnishing}</span>}
        </p>

        <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-600 text-xs">
          <MapPin size={10} className="shrink-0" />
          <span className="truncate">{listing.title}</span>
        </div>
      </div>
    </div>
  )
}
