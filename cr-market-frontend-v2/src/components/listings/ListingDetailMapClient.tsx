'use client'

import dynamic from 'next/dynamic'

const ListingDetailMap = dynamic(
  () => import('./ListingDetailMap').then((m) => m.ListingDetailMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[260px] border border-soft bg-soft animate-pulse flex items-center justify-center text-muted text-sm">
        Cargando mapa…
      </div>
    ),
  }
)

export function ListingDetailMapClient({ lat, lng }: { lat: number; lng: number }) {
  return <ListingDetailMap lat={lat} lng={lng} />
}
