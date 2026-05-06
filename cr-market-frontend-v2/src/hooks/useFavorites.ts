'use client'

import { useCallback, useEffect, useState } from 'react'
import type { FavoriteId } from '@/types/listing'

const STORAGE_KEY = 'cr-market.favorites'

function readFavorites(): FavoriteId[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeFavorites(favs: FavoriteId[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs))
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteId[]>([])

  // Hydrate from localStorage on mount (avoids SSR mismatch).
  useEffect(() => {
    setFavorites(readFavorites())
  }, [])

  const isFavorite = useCallback((id: FavoriteId) => favorites.includes(id), [favorites])

  const toggle = useCallback((id: FavoriteId) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      writeFavorites(next)
      return next
    })
  }, [])

  return { favorites, isFavorite, toggle }
}
