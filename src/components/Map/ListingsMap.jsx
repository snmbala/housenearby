import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'

const LOCATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`
const HOUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const listingCardIcon = (listing, hovered = false) => {
  const thumb = listing.images?.[0]
  const price = `₹${Number(listing.rent_amount).toLocaleString('en-IN')}`
  const img = thumb
    ? `<img src="${thumb}" style="width:100%;height:52px;object-fit:cover;display:block;" />`
    : `<div style="width:100%;height:52px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">${HOUSE_SVG}</div>`

  const activeStyle = hovered
    ? 'transform:translateY(-4px) scale(1.08);box-shadow:0 8px 24px rgba(0,0,0,0.28),0 0 0 2.5px #0a0a0a;'
    : ''

  return L.divIcon({
    className: '',
    html: `
      <div class="map-card" style="${activeStyle}">
        ${img}
        <div class="map-card-price">${price}</div>
        <div class="map-card-tip"></div>
      </div>
    `,
    iconSize: [88, 84],
    iconAnchor: [44, 84],
    popupAnchor: [0, -88],
  })
}

const userLocationIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:20px;height:20px">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.15);border-radius:50%;animation:pulse-ring 1.8s ease-out infinite"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#0a0a0a;border:2.5px solid white;border-radius:50%;box-shadow:0 0 0 1.5px rgba(0,0,0,0.15)"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function MapClickHandler({ onClick }) {
  useMapEvents({ click: onClick })
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

export default function ListingsMap({
  listings = [],
  onMapClick,
  pickMode = false,
  center = [20.5937, 78.9629],
  zoom = 5,
  userCoords = null,
  onSelect = null,
  hoveredId = null,
}) {
  const navigate = useNavigate()

  const handleMarkerClick = (listing) => {
    if (onSelect) onSelect(listing)
    else navigate(`/listing/${listing.id}`)
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      maxZoom={19}
      zoomControl={false}
      className={pickMode ? 'cursor-crosshair' : ''}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        maxNativeZoom={19}
      />

      <FlyToCenter center={center} zoom={zoom} />
      <ZoomControl position="bottomright" />
      <LocateButton userCoords={userCoords} />
      {onMapClick && <MapClickHandler onClick={onMapClick} />}

      {userCoords && (
        <Marker position={[userCoords.lat, userCoords.lng]} icon={userLocationIcon} />
      )}

      {listings.map((listing) => {
        const hovered = listing.id === hoveredId
        return (
          <Marker
            key={listing.id}
            position={[listing.lat, listing.lng]}
            icon={listingCardIcon(listing, hovered)}
            zIndexOffset={hovered ? 1000 : 0}
            eventHandlers={{ click: () => handleMarkerClick(listing) }}
          />
        )
      })}
    </MapContainer>
  )
}
