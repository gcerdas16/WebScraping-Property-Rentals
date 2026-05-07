'use client'

import dynamic from 'next/dynamic'
import type { Listing } from '@/types/listing'

// Leaflet manipulates the DOM directly; disable SSR.
const ListingsMap = dynamic(() => import('./ListingsMap').then((m) => m.ListingsMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[640px] border border-soft bg-soft animate-pulse flex items-center justify-center text-muted text-sm">
      Cargando mapa…
    </div>
  ),
})

export function ListingsMapClient({ listings }: { listings: Listing[] }) {
  return <ListingsMap listings={listings} />
}
