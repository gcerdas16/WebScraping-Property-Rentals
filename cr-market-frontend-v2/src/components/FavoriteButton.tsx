'use client'

import { useFavorites } from '@/hooks/useFavorites'

export function FavoriteButton({ id }: { id: string }) {
  const { isFavorite, toggle } = useFavorites()
  const active = isFavorite(id)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(id)
      }}
      aria-label={active ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-cream/90 hover:bg-cream backdrop-blur flex items-center justify-center transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill={active ? '#1a1a1a' : 'none'}
        stroke="#1a1a1a"
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
