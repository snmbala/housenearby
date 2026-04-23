export const BHK_LABELS = { 0: 'Studio', 1: '1 BHK', 2: '2 BHK', 3: '3 BHK', 4: '4+ BHK' }
export const FURNISHING_LABELS = { furnished: 'Furnished', semi: 'Semi', unfurnished: 'Unfurnished' }

export function fmtDist(km) {
  if (km == null) return null
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}
