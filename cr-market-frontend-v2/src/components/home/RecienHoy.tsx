import { getRecentListings } from '@/lib/queries'
import { ListingCard } from '@/components/ListingCard'

export async function RecienHoy() {
  // Skip the 3 shown in HomeIntro sidebar to avoid duplicates.
  const listings = await getRecentListings(6, 3)

  if (listings.length === 0) return null

  return (
    <section className="bg-white border-t border-soft">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-14 md:py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-accent">
              Más recientes
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight mt-2 leading-none">
              Otras propiedades de los últimos días
            </h2>
          </div>
          <a
            href="/nuevos"
            className="text-sm font-semibold underline hover:text-muted transition-colors"
          >
            Ver todas →
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.source_id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  )
}
