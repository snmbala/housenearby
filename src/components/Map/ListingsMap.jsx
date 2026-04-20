import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'

const LOCATE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const priceIcon = (price) => L.divIcon({
  className: '',
  html: `<div class="price-pin">₹${Number(price).toLocaleString('en-IN')}</div>`,
  iconAnchor: [0, 12],
})

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
}) {
  const navigate = useNavigate()

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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        maxNativeZoom={19}
      />

      <FlyToCenter center={center} zoom={zoom} />
      <ZoomControl position="bottomright" />
      <LocateButton userCoords={userCoords} />
      {onMapClick && <MapClickHandler onClick={onMapClick} />}

      {userCoords && (
        <Marker position={[userCoords.lat, userCoords.lng]} icon={userLocationIcon}>
          <Popup>
            <div style={{ padding: '10px 14px' }}>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>You are here</p>
            </div>
          </Popup>
        </Marker>
      )}

      {listings.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.lat, listing.lng]}
          icon={priceIcon(listing.rent_amount)}
          eventHandlers={{ click: () => navigate(`/listing/${listing.id}`) }}
        >
          <Popup>
            <div style={{ padding: '12px 14px', minWidth: 180 }}>
              <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 4px' }}>{listing.title}</p>
              <p style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>
                ₹{Number(listing.rent_amount).toLocaleString('en-IN')}/mo
              </p>
              <p style={{ fontSize: 11, opacity: 0.5, margin: '0 0 10px' }}>{listing.city}</p>
              <button
                onClick={() => navigate(`/listing/${listing.id}`)}
                style={{
                  fontSize: 12, fontWeight: 500,
                  background: '#0a0a0a', color: 'white',
                  padding: '5px 12px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', width: '100%',
                }}
              >
                View details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
