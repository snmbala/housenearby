export const BHK_LABELS = { 0: 'RK', 1: '1 BHK', 2: '2 BHK', 3: '3 BHK', 4: '4+ BHK' }
export const BHK_OPTIONS = [
  { value: 0, label: 'RK' },
  { value: 1, label: '1 BHK' },
  { value: 2, label: '2 BHK' },
  { value: 3, label: '3 BHK' },
  { value: 4, label: '4+ BHK' },
]
export const RENT_PRESETS = [5000, 8000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000]
export const FURNISHING_LABELS = { furnished: 'Furnished', semi: 'Semi', unfurnished: 'Unfurnished' }
export const AMENITIES = [
  { value: 'wifi',          label: 'Wi-Fi' },
  { value: 'parking_2w',   label: '2W Parking' },
  { value: 'parking_4w',   label: '4W Parking' },
  { value: 'ac',            label: 'AC' },
  { value: 'power_backup',  label: 'Power Backup' },
  { value: 'lift',          label: 'Lift' },
  { value: 'security',      label: 'Security / CCTV' },
  { value: 'gym',           label: 'Gym' },
  { value: 'swimming_pool', label: 'Swimming Pool' },
  { value: 'gated',         label: 'Gated Community' },
  { value: 'balcony',       label: 'Balcony' },
  { value: 'water_24x7',   label: 'Water 24×7' },
  { value: 'garden',        label: 'Garden' },
  { value: 'pet_friendly',  label: 'Pet Friendly' },
  { value: 'intercom',      label: 'Intercom' },
  { value: 'clubhouse',     label: 'Club House' },
]

export function fmtDist(km) {
  if (km == null) return null
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export function listingSlug(listing) {
  const bhk = { 0: 'rk', 1: '1bhk', 2: '2bhk', 3: '3bhk', 4: '4bhk' }[listing.bhk] ?? 'property'
  const type = (listing.property_type ?? 'property').toLowerCase()
  const area = listing.address?.split(',')[0]?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ?? ''
  const city = (listing.city ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return [bhk, type, 'for-rent-in', area, city].filter(Boolean).join('-').replace(/-+/g, '-').slice(0, 80)
}

export function listingUrl(listing) {
  return `/rent/${listingSlug(listing)}/${listing.id}`
}

export function listingMetaTitle(listing) {
  const bhk = BHK_LABELS[listing.bhk] ?? `${listing.bhk} BHK`
  const type = listing.property_type
    ? listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)
    : 'Property'
  const area = listing.address?.split(',')[0]?.trim()
  const city = listing.city
  const price = `₹${Number(listing.rent_amount).toLocaleString('en-IN')}/month`
  const location = [area, city].filter(Boolean).join(', ')
  return `${bhk} ${type} for Rent in ${location} — ${price}`
}

export function listingMetaDesc(listing) {
  const bhk = BHK_LABELS[listing.bhk] ?? `${listing.bhk} BHK`
  const type = listing.property_type
    ? listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)
    : 'Property'
  const furnish = FURNISHING_LABELS[listing.furnishing]
  const area = listing.address?.split(',')[0]?.trim()
  const city = listing.city
  const price = `₹${Number(listing.rent_amount).toLocaleString('en-IN')}/month`
  const location = [area, city].filter(Boolean).join(', ')
  const furnishText = furnish ? `${furnish} ` : ''
  const deposit = listing.deposit_amount
    ? ` Security deposit ₹${Number(listing.deposit_amount).toLocaleString('en-IN')}.`
    : ''
  return `${furnishText}${bhk} ${type} for rent in ${location} at ${price}.${deposit} No broker. Contact owner directly on HouseNearby.`
}
