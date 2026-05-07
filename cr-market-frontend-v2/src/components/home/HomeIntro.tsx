import Image from 'next/image'
import Link from 'next/link'
import { getActiveListingsCount, getRecentListings } from '@/lib/queries'
import { formatPrice, formatTimeSince } from '@/lib/formatters'
import { WHATSAPP_CHANNEL_URL } from '@/lib/config'

export async function HomeIntro() {
  const [count, listings] = await Promise.all([
    getActiveListingsCount(),
    getRecentListings(3),
  ])

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-8 pb-12">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          {/* LEFT — Hero */}
          <div>
            <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-ink mb-2">
              CR Market
            </div>
            <h1 className="font-display text-[80px] md:text-[110px] leading-[0.85] tracking-mega text-ink">
              {count}
              <span className="text-accent">.</span>
            </h1>
            <div className="font-display italic text-xl md:text-[22px] mt-1 leading-[1.05] text-ink">
              propiedades escogidas en Costa Rica.
            </div>
            <p className="mt-3.5 max-w-[520px] text-[13px] leading-[1.55] text-muted">
              En colones, bien filtradas. Lo nuevo te llega al WhatsApp — no tenés que pasar horas
              en Facebook.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <a
                href="/listings"
                className="bg-ink text-cream px-[26px] py-[13px] text-[13px] font-semibold tracking-wide hover:bg-muted transition-colors"
              >
                Ver propiedades →
              </a>
              <a
                href={WHATSAPP_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-accent text-ink px-[26px] py-[13px] text-[13px] font-bold tracking-wide hover:bg-accent/90 transition-colors"
              >
                Canal WhatsApp
              </a>
            </div>
          </div>

          {/* RIGHT — Recién hoy sidebar */}
          <div className="lg:pt-2">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-accent">
                  Recién hoy
                </div>
                <h2 className="font-serif text-[22px] font-bold tracking-tight mt-1 leading-none">
                  Listadas hace menos de 24h
                </h2>
              </div>
              <Link
                href="/nuevos"
                className="text-[12px] font-semibold underline hover:text-muted transition-colors"
              >
                Ver todas →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {listings.map((listing) => (
                <Link
                  key={listing.source_id}
                  href={`/listings/${listing.source_id}`}
                  className="group relative aspect-square overflow-hidden bg-soft"
                >
                  {listing.image_urls?.[0] ? (
                    <Image
                      src={listing.image_urls[0]}
                      alt={listing.title}
                      fill
                      sizes="200px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full bg-soft" />
                  )}
                  <span className="absolute top-2 left-2 z-10 bg-accent text-ink px-1.5 py-0.5 text-[9px] font-bold tracking-[0.1em] uppercase">
                    {formatTimeSince(listing.created_at)}
                  </span>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 text-cream">
                    <div className="text-[11px] font-bold leading-tight">
                      {formatPrice({
                        crc: listing.price_final_crc,
                        usd: listing.price_final_usd,
                      })}
                    </div>
                    {listing.location_city && (
                      <div className="text-[10px] opacity-85 truncate leading-tight">
                        {listing.location_city}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
