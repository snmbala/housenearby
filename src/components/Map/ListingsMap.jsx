import { useEffect, useState, useRef } from 'react'
import { MapContainer, Marker, useMapEvents, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import GoogleMutant from 'leaflet.gridlayer.googlemutant/src/Leaflet.GoogleMutant.mjs'
import { useNavigate } from 'react-router-dom'
import { useGoogleMaps } from '../../hooks/useGoogleMaps'
import { listingUrl } from '../../lib/listing'

const LOCATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`

const CHEVRON_LEFT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`
const CHEVRON_RIGHT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`

const listingPinIcon = (listing, active = false) => {
  const price = `₹${Number(listing.rent_amount).toLocaleString('en-IN')}`
  return L.divIcon({
    className: '',
    html: `<div class="map-pin${active ? ' map-pin--active' : ''}">${price}</div>`,
    iconSize: [96, 28],
    iconAnchor: [48, 28],
  })
}

const userLocationIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:20px;height:20px">
      <div style="position:absolute;inset:0;background:rgba(124,58,237,0.2);border-radius:50%;animation:pulse-ring 1.8s ease-out infinite"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#7c3aed;border:2.5px solid white;border-radius:50%;box-shadow:0 0 0 1.5px rgba(124,58,237,0.3)"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const searchedLocationIcon = L.divIcon({
  className: '',
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30"><path d="M11 0C4.93 0 0 4.93 0 11c0 8.25 11 19 11 19S22 19.25 22 11C22 4.93 17.07 0 11 0z" fill="#0ea5e9" stroke="white" stroke-width="1.5"/><circle cx="11" cy="11" r="4" fill="white"/></svg>`,
  iconSize: [22, 30],
  iconAnchor: [11, 30],
})

const MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#f0ede8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#ddd8d0' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#f8f8f8' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c8dff0' }] },
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#f5f2ee' }] },
  { featureType: 'landscape.man_made', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]

// ── Listing card popup ───────────────────────────────────────

function ListingCard({ listing, pos, onClose, onOpen }) {
  const [imgIdx, setImgIdx] = useState(0)
  const images = Array.isArray(listing.images) ? listing.images.filter(Boolean) : []
  const total = images.length

  const prev = (e) => { e.stopPropagation(); setImgIdx(i => Math.max(0, i - 1)) }
  const next = (e) => { e.stopPropagation(); setImgIdx(i => Math.min(total - 1, i + 1)) }

  // Reset image index when listing changes
  useEffect(() => { setImgIdx(0) }, [listing.id])

  return (
    <div
      className="absolute z-[2000] w-[240px] bg-white dark:bg-neutral-950 rounded-2xl shadow-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800"
      style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, calc(-100% - 44px))' }}
      // small downward pointing triangle to connect card to pin
    >
      {/* Image area */}
      <div
        className="relative h-[150px] bg-neutral-100 dark:bg-neutral-900 overflow-hidden cursor-pointer"
        onClick={onOpen}
      >
        {total > 0 ? (
          <img
            src={images[imgIdx]}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-700">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </div>
        )}

        {/* Prev / Next buttons */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              disabled={imgIdx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center shadow-lg transition-opacity disabled:opacity-0"
              dangerouslySetInnerHTML={{ __html: CHEVRON_LEFT }}
            />
            <button
              onClick={next}
              disabled={imgIdx === total - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center shadow-lg transition-opacity disabled:opacity-0"
              dangerouslySetInnerHTML={{ __html: CHEVRON_RIGHT }}
            />

            {/* Dot indicators */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 ${
                    i === imgIdx ? 'w-3.5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Counter badge */}
            <div className="absolute top-2 right-2 bg-black/45 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full pointer-events-none">
              {imgIdx + 1}/{total}
            </div>
          </>
        )}
      </div>

      {/* Details row */}
      <div className="px-3 py-2.5 flex items-start justify-between gap-2 cursor-pointer" onClick={onOpen}>
        <div className="min-w-0">
          <p className="font-bold text-sm text-neutral-950 dark:text-white leading-tight">
            ₹{Number(listing.rent_amount).toLocaleString('en-IN')}
            <span className="font-normal text-xs text-neutral-400 dark:text-neutral-500">/mo</span>
          </p>
          {listing.title && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate mt-0.5">{listing.title}</p>
          )}
          {(listing.address || listing.city) && (
            <p className="text-[10px] text-neutral-400 dark:text-neutral-600 truncate mt-0.5">
              {listing.address || listing.city}
            </p>
          )}
        </div>
        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="shrink-0 w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors mt-0.5"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Map helpers ──────────────────────────────────────────────

function GoogleMutantLayer() {
  const map = useMap()
  const { loaded } = useGoogleMaps()
  useEffect(() => {
    if (!loaded) return
    const layer = new GoogleMutant({ type: 'roadmap', maxZoom: 20, styles: MAP_STYLES })
    layer.addTo(map)
    return () => map.removeLayer(layer)
  }, [loaded, map])
  return null
}

function MapClickHandler({ onClick }) {
  useMapEvents({ click: onClick })
  return null
}

function BoundsTracker({ onBoundsChange }) {
  const map = useMap()
  const emit = () => {
    const b = map.getBounds()
    onBoundsChange?.({ south: b.getSouth(), north: b.getNorth(), west: b.getWest(), east: b.getEast() })
  }
  useMapEvents({ moveend: emit, zoomend: emit })
  useEffect(() => { emit() }, [])
  return null
}

function FlyToCenter({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 })
  }, [center[0], center[1], zoom])
  return null
}

function LocateButton({ userCoords }) {
  const map = useMap()
  useEffect(() => {
    if (!userCoords) return
    const Ctrl = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', 'locate-btn')
        btn.innerHTML = LOCATE_SVG
        btn.title = 'Go to my location'
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stopPropagation(e)
          map.flyTo([userCoords.lat, userCoords.lng], 14, { duration: 1.2 })
        })
        return btn
      },
    })
    const ctrl = new Ctrl({ position: 'bottomright' })
    ctrl.addTo(map)
    return () => ctrl.remove()
  }, [userCoords?.lat, userCoords?.lng, map])
  return null
}

// Closes the card when the user clicks the map background or starts panning
function MapDismissHandler({ onDismiss }) {
  useMapEvents({ click: onDismiss, movestart: onDismiss, zoomstart: onDismiss })
  return null
}

// Each price pin — click opens the card
function PinMarker({ listing, isActive, onCardOpen }) {
  const map = useMap()
  return (
    <Marker
      position={[listing.lat, listing.lng]}
      icon={listingPinIcon(listing, isActive)}
      zIndexOffset={isActive ? 1000 : 0}
      eventHandlers={{
        click: () => {
          const pt = map.latLngToContainerPoint([listing.lat, listing.lng])
          onCardOpen(listing, { x: pt.x, y: pt.y })
        },
      }}
    />
  )
}

// ── Main component ───────────────────────────────────────────

export default function ListingsMap({
  listings = [],
  onMapClick,
  pickMode = false,
  center = [20.5937, 78.9629],
  zoom = 5,
  userCoords = null,
  searchedCoords = null,
  onSelect = null,
  hoveredId = null,
  onBoundsChange = null,
}) {
  const navigate = useNavigate()
  const { error: mapsError } = useGoogleMaps()
  const [activeCard, setActiveCard] = useState(null) // { listing, pos }

  const openCard = (listing, pos) => setActiveCard({ listing, pos })
  const closeCard = () => setActiveCard(null)

  const openListing = (listing) => {
    if (onSelect) onSelect(listing)
    else navigate(listingUrl(listing))
  }

  const validListings = listings.filter(l => l.lat != null && l.lng != null)

  return (
    <div className="relative h-full w-full">
      {mapsError && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[2000] bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-full pointer-events-none">
          Map tiles unavailable — check your Google Maps API key
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        maxZoom={20}
        zoomControl={false}
        attributionControl={false}
        className={pickMode ? 'cursor-crosshair' : ''}
        style={{ height: '100%', width: '100%' }}
      >
        <GoogleMutantLayer />
        <FlyToCenter center={center} zoom={zoom} />
        <ZoomControl position="bottomright" />
        <LocateButton userCoords={userCoords} />
        <BoundsTracker onBoundsChange={onBoundsChange} />
        <MapDismissHandler onDismiss={closeCard} />
        {onMapClick && <MapClickHandler onClick={onMapClick} />}

        {userCoords && (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={userLocationIcon} />
        )}
        {searchedCoords && (
          <Marker position={[searchedCoords.lat, searchedCoords.lng]} icon={searchedLocationIcon} />
        )}

        {validListings.map(listing => (
          <PinMarker
            key={listing.id}
            listing={listing}
            isActive={listing.id === hoveredId || listing.id === activeCard?.listing.id}
            onCardOpen={openCard}
          />
        ))}
      </MapContainer>

      {activeCard && (
        <ListingCard
          listing={activeCard.listing}
          pos={activeCard.pos}
          onClose={closeCard}
          onOpen={() => openListing(activeCard.listing)}
        />
      )}
    </div>
  )
}
