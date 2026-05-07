'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, formatTimeSince } from '@/lib/formatters'
import type { Listing } from '@/types/listing'

// Default Leaflet marker icons reference assets that don't bundle correctly with Next.js.
// Use a simple custom DivIcon so markers render with our brand color.
const markerIcon = L.divIcon({
  className: 'cr-marker',
  html: `<div style="width:14px;height:14px;background:#84cc16;border:2px solid #1a1a1a;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -8],
})

// Center map on Costa Rica by default; fit bounds when listings exist.
const COSTA_RICA_CENTER: [number, number] = [9.93, -84.08]

function FitBounds({ markers }: { markers: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (markers.length === 0) return
    if (markers.length === 1) {
      map.setView(markers[0], 13)
      return
    }
    const bounds = L.latLngBounds(markers)
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [map, markers])
  return null
}

export function ListingsMap({ listings }: { listings: Listing[] }) {
  const placed = listings.filter(
    (l): l is Listing & { location_latitude: number; location_longitude: number } =>
      l.location_latitude != null && l.location_longitude != null
  )

  const markers: Array<[number, number]> = placed.map((l) => [
    l.location_latitude,
    l.location_longitude,
  ])

  return (
    <div className="relative w-full h-[640px] border border-soft bg-soft">
      <MapContainer
        center={COSTA_RICA_CENTER}
        zoom={9}
        scrollWheelZoom
        className="w-full h-full"
        style={{ background: '#e5e5e0' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds markers={markers} />
        {placed.map((l) => (
          <Marker
            key={l.source_id}
            position={[l.location_latitude, l.location_longitude]}
            icon={markerIcon}
          >
            <Popup>
              <Link
                href={`/listings/${l.source_id}`}
                className="block w-[220px] no-underline text-ink"
              >
                {l.image_urls?.[0] && (
                  <div className="relative w-full h-[120px] mb-2 overflow-hidden bg-soft">
                    <Image
                      src={l.image_urls[0]}
                      alt={l.title}
                      fill
                      sizes="220px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="font-bold text-[13px] leading-tight">
                  {formatPrice({ crc: l.price_final_crc, usd: l.price_final_usd })}
                </div>
                {l.location_city && (
                  <div className="text-[11px] text-muted mt-0.5">{l.location_city}</div>
                )}
                <div className="text-[10px] text-accent font-bold uppercase tracking-wider mt-1">
                  {formatTimeSince(l.created_at)}
                </div>
                <div className="text-[12px] mt-1 line-clamp-2 leading-snug">{l.title}</div>
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {placed.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-cream/90 z-[1000] pointer-events-none">
          <div className="text-center text-muted text-sm max-w-md px-6">
            Ninguna de las propiedades filtradas tiene coordenadas. Probá con otros filtros o pasá a
            vista lista.
          </div>
        </div>
      )}
    </div>
  )
}
