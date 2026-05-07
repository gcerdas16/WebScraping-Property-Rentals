'use client'

import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const markerIcon = L.divIcon({
  className: 'cr-marker',
  html: `<div style="width:18px;height:18px;background:#84cc16;border:3px solid #1a1a1a;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

export function ListingDetailMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="w-full h-[260px] border border-soft overflow-hidden">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full"
        style={{ background: '#e5e5e0' }}
      >
        <TileLayer
          attribution='&copy; CARTO &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[lat, lng]} icon={markerIcon} />
      </MapContainer>
    </div>
  )
}
