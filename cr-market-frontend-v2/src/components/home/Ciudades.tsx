import Link from 'next/link'
import { getCitiesWithCounts } from '@/lib/queries'

export async function Ciudades() {
  const cities = await getCitiesWithCounts(6)

  if (cities.length === 0) return null

  return (
    <section className="bg-cream border-t border-soft">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 md:py-20">
        <div className="mb-10">
          <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-ink">
            Por ciudad
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mt-2 leading-none">
            ¿Dónde estás buscando?
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {cities.map(({ city, count }) => (
            <Link
              key={city}
              href={`/listings?city=${encodeURIComponent(city)}`}
              className="group bg-white border border-soft hover:border-ink p-5 transition-colors"
            >
              <div className="font-serif font-bold text-lg leading-tight group-hover:text-accent transition-colors">
                {city}
              </div>
              <div className="text-xs text-muted mt-1">
                {count} {count === 1 ? 'propiedad' : 'propiedades'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
