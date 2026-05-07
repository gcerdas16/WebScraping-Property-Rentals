import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PhotoGallery } from '@/components/listings/PhotoGallery'
import { ListingDetailMapClient } from '@/components/listings/ListingDetailMapClient'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ListingCard } from '@/components/ListingCard'
import { getListingBySourceId, getSimilarListings } from '@/lib/queries'
import { formatPrice, formatTimeSince } from '@/lib/formatters'
import { WHATSAPP_CHANNEL_URL } from '@/lib/config'

export const revalidate = 600

export async function generateMetadata(props: {
  params: Promise<{ source_id: string }>
}): Promise<Metadata> {
  const { source_id } = await props.params
  const listing = await getListingBySourceId(source_id)
  if (!listing) return { title: 'Propiedad no encontrada — CR Market' }
  return {
    title: `${listing.title} — CR Market`,
    description: listing.description?.slice(0, 160) ?? undefined,
  }
}

export default async function ListingDetailPage(props: {
  params: Promise<{ source_id: string }>
}) {
  const { source_id } = await props.params
  const listing = await getListingBySourceId(source_id)
  if (!listing) notFound()

  const similar = await getSimilarListings(listing, 3)
  const photos = (listing.image_urls ?? []).filter(Boolean)
  const price = formatPrice({ crc: listing.price_final_crc, usd: listing.price_final_usd })
  const since = formatTimeSince(listing.created_at)
  const cityProvince = [listing.location_city, listing.location_province]
    .filter(Boolean)
    .join(', ')

  const facts = [
    listing.bedrooms_ai != null && { label: 'Cuartos', value: listing.bedrooms_ai },
    listing.bathrooms_ai != null && { label: 'Baños', value: listing.bathrooms_ai },
    listing.property_type_ai && { label: 'Tipo', value: listing.property_type_ai },
    listing.furnished != null && { label: 'Amueblado', value: listing.furnished ? 'Sí' : 'No' },
    listing.pets_allowed != null && {
      label: 'Mascotas',
      value: listing.pets_allowed ? 'Sí' : 'No',
    },
    listing.parking != null && { label: 'Parqueo', value: listing.parking ? 'Sí' : 'No' },
  ].filter(Boolean) as Array<{ label: string; value: string | number }>

  return (
    <article className="bg-cream">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8">
        <Link
          href="/listings"
          className="inline-flex text-[12px] font-semibold text-muted hover:text-ink transition-colors mb-6"
        >
          ← Volver a propiedades
        </Link>

        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          {/* LEFT: gallery + info */}
          <div>
            <PhotoGallery photos={photos} title={listing.title} />

            <div className="mt-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-accent text-ink px-2 py-1 text-[10px] font-bold tracking-[0.15em] uppercase">
                  {since}
                </span>
                {listing.property_type_ai && (
                  <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted">
                    {listing.property_type_ai}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                {listing.title}
              </h1>
              {cityProvince && <div className="text-muted text-sm mt-2">{cityProvince}</div>}
            </div>

            {facts.length > 0 && (
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {facts.map((f) => (
                  <div key={f.label} className="bg-white border border-soft p-4">
                    <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted">
                      {f.label}
                    </div>
                    <div className="font-serif text-xl font-bold mt-1 leading-none">{f.value}</div>
                  </div>
                ))}
              </div>
            )}

            {listing.description && (
              <div className="mt-10">
                <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-accent mb-2">
                  Descripción
                </div>
                <p className="font-serif text-lg leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: sticky sidebar with price + contact + map */}
          <aside className="lg:sticky lg:top-20 lg:self-start space-y-5">
            <div className="bg-white border border-soft p-6 relative">
              <FavoriteButton id={listing.source_id} />
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted">
                Precio mensual
              </div>
              <div className="font-display text-4xl mt-1 leading-none">
                {price}
                {price !== 'Consultar' && (
                  <span className="font-sans text-base font-normal text-muted ml-2">/mes</span>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {listing.contact_phone && (
                  <a
                    href={`https://wa.me/${listing.contact_phone.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-ink text-cream px-5 py-3 text-[13px] font-semibold tracking-wide hover:bg-muted transition-colors text-center"
                  >
                    Contactar al anunciante
                  </a>
                )}
                <a
                  href={WHATSAPP_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-accent text-ink px-5 py-3 text-[13px] font-bold tracking-wide hover:bg-accent/90 transition-colors text-center"
                >
                  Canal de WhatsApp
                </a>
              </div>

              {listing.contact_phone && (
                <div className="text-[11px] text-muted mt-3 text-center">
                  Teléfono: {listing.contact_phone}
                </div>
              )}
            </div>

            {listing.location_latitude != null && listing.location_longitude != null && (
              <div>
                <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-muted mb-2">
                  Ubicación
                </div>
                <ListingDetailMapClient
                  lat={listing.location_latitude}
                  lng={listing.location_longitude}
                />
              </div>
            )}
          </aside>
        </div>

        {similar.length > 0 && (
          <div className="mt-20 pt-10 border-t border-soft">
            <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-accent mb-2">
              Similares
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight leading-none mb-6">
              Otras propiedades en {listing.location_city ?? 'la zona'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {similar.map((l) => (
                <ListingCard key={l.source_id} listing={l} />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
