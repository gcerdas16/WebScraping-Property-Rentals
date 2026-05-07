import { Suspense } from 'react'
import { Filters } from '@/components/listings/Filters'
import { ViewToggle } from '@/components/listings/ViewToggle'
import { Pagination } from '@/components/listings/Pagination'
import { ListingsMapClient } from '@/components/listings/ListingsMapClient'
import { ListingCard } from '@/components/ListingCard'
import { getListings, getAllCities } from '@/lib/queries'

export const revalidate = 300

function parseFilters(sp: { [k: string]: string | string[] | undefined }) {
  const get = (k: string) => {
    const v = sp[k]
    return Array.isArray(v) ? v[0] : v
  }
  const view: 'map' | 'grid' = get('view') === 'map' ? 'map' : 'grid'
  const page = Math.max(1, Number.parseInt(get('page') ?? '1', 10) || 1)
  const pageSize = view === 'map' ? 100 : 12
  return {
    view,
    page,
    pageSize,
    type: get('type') || undefined,
    city: get('city') || undefined,
    bedrooms: get('bedrooms') ? Number.parseInt(get('bedrooms')!, 10) : undefined,
    priceMin: get('priceMin') ? Number.parseInt(get('priceMin')!, 10) : undefined,
    priceMax: get('priceMax') ? Number.parseInt(get('priceMax')!, 10) : undefined,
  }
}

export default async function ListingsPage(props: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const sp = await props.searchParams
  const f = parseFilters(sp)

  const [{ listings, total }, cities] = await Promise.all([
    getListings({
      type: f.type,
      city: f.city,
      bedrooms: f.bedrooms,
      priceMin: f.priceMin,
      priceMax: f.priceMax,
      page: f.view === 'map' ? 1 : f.page,
      pageSize: f.pageSize,
    }),
    getAllCities(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / f.pageSize))

  return (
    <>
      <Suspense fallback={<div className="bg-cream border-b border-soft h-20" />}>
        <Filters cities={cities} />
      </Suspense>

      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight leading-none">
                {total} {total === 1 ? 'propiedad' : 'propiedades'}
              </h1>
              <p className="text-[13px] text-muted mt-1">
                Casas y apartamentos en alquiler · ordenados por novedad
              </p>
            </div>
            <Suspense fallback={null}>
              <ViewToggle current={f.view} />
            </Suspense>
          </div>

          {listings.length === 0 ? (
            <div className="border border-soft bg-white py-20 text-center">
              <div className="text-muted text-sm">
                No encontramos propiedades con esos filtros. Probá ajustando criterios.
              </div>
            </div>
          ) : f.view === 'map' ? (
            <ListingsMapClient listings={listings} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {listings.map((l) => (
                  <ListingCard key={l.source_id} listing={l} />
                ))}
              </div>
              <Suspense fallback={null}>
                <Pagination page={f.page} totalPages={totalPages} />
              </Suspense>
            </>
          )}
        </div>
      </section>
    </>
  )
}
