import Image from 'next/image'
import Link from 'next/link'
import { FavoriteButton } from './FavoriteButton'
import { formatPrice, formatTimeSince } from '@/lib/formatters'
import type { Listing } from '@/types/listing'

export function ListingCard({ listing }: { listing: Listing }) {
  const photo = listing.image_urls?.[0]
  const price = formatPrice({ crc: listing.price_final_crc, usd: listing.price_final_usd })
  const since = formatTimeSince(listing.created_at)
  const cityProvince = [listing.location_city, listing.location_province].filter(Boolean).join(', ')

  return (
    <Link href={`/listings/${listing.source_id}`} className="group block relative">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {photo ? (
          <Image
            src={photo}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-soft flex items-center justify-center text-muted text-xs">
            Sin foto
          </div>
        )}

        <span className="absolute top-3 left-3 z-10 bg-accent text-ink px-2 py-1 text-[10px] font-bold tracking-[0.15em] uppercase">
          {since}
        </span>

        <FavoriteButton id={listing.source_id} />

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-cream">
          <div className="font-bold text-base">
            {price}
            {price !== 'Consultar' && <span className="text-xs font-normal opacity-80">/mes</span>}
          </div>
          {cityProvince && <div className="text-xs opacity-85 mt-0.5">{cityProvince}</div>}
        </div>
      </div>

      <div className="mt-3">
        <h3 className="font-serif font-bold text-base leading-snug line-clamp-2 group-hover:text-muted transition-colors">
          {listing.title}
        </h3>
        <div className="mt-1 text-xs text-muted flex gap-3">
          {listing.bedrooms_ai != null && <span>{listing.bedrooms_ai} cuartos</span>}
          {listing.bathrooms_ai != null && <span>{listing.bathrooms_ai} baños</span>}
          {listing.property_type_ai && <span>{listing.property_type_ai}</span>}
        </div>
      </div>
    </Link>
  )
}
