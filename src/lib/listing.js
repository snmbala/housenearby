export const BHK_LABELS = { 0: 'Studio', 1: '1 BHK', 2: '2 BHK', 3: '3 BHK', 4: '4+ BHK' }
export const BHK_OPTIONS = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1 BHK' },
  { value: 2, label: '2 BHK' },
  { value: 3, label: '3 BHK' },
  { value: 4, label: '4+ BHK' },
]
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
