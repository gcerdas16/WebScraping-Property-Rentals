'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export function ViewToggle({ current }: { current: 'grid' | 'map' }) {
  const params = useSearchParams()

  const buildHref = (view: 'grid' | 'map') => {
    const next = new URLSearchParams(params.toString())
    if (view === 'grid') next.delete('view')
    else next.set('view', 'map')
    return `/listings${next.toString() ? `?${next.toString()}` : ''}`
  }

  const baseClass = 'h-9 px-4 text-[12px] font-semibold tracking-wide uppercase transition-colors'

  return (
    <div className="inline-flex border border-ink">
      <Link
        href={buildHref('grid')}
        className={`${baseClass} ${current === 'grid' ? 'bg-ink text-cream' : 'text-ink hover:bg-soft'}`}
      >
        Lista
      </Link>
      <Link
        href={buildHref('map')}
        className={`${baseClass} border-l border-ink ${current === 'map' ? 'bg-ink text-cream' : 'text-ink hover:bg-soft'}`}
      >
        Mapa
      </Link>
    </div>
  )
}
