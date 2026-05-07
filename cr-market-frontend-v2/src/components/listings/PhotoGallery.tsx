'use client'

import Image from 'next/image'
import { useState } from 'react'

export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const [active, setActive] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="aspect-[4/3] bg-soft flex items-center justify-center text-muted text-sm">
        Sin fotos disponibles
      </div>
    )
  }

  const mainPhoto = photos[active] ?? photos[0]

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] bg-soft overflow-hidden">
        <Image
          src={mainPhoto}
          alt={title}
          fill
          sizes="(max-width: 1024px) 100vw, 70vw"
          className="object-cover"
          priority
        />
      </div>

      {photos.length > 1 && (
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {photos.slice(0, 16).map((p, i) => (
            <button
              key={`${p}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-square overflow-hidden bg-soft transition-opacity ${
                i === active ? 'opacity-100 ring-2 ring-ink' : 'opacity-70 hover:opacity-100'
              }`}
              aria-label={`Foto ${i + 1}`}
            >
              <Image
                src={p}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
