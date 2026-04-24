import { Helmet } from 'react-helmet-async'

const SITE = 'https://housenearby.in'

export default function SEOMeta({ title, description, image, jsonLd, canonical }) {
  const fullTitle = title ? `${title} | HouseNearby` : 'HouseNearby — Find Rentals Near You'
  const desc = description ?? 'Discover rental properties near you on a live map. Browse apartments, houses, PGs and villas across India. Contact landlords directly — no broker fees.'
  const canonicalUrl = canonical ?? (typeof window !== 'undefined' ? window.location.href : '')

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="HouseNearby" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  )
}
