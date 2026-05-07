'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const params = useSearchParams()
  if (totalPages <= 1) return null

  const buildHref = (p: number) => {
    const next = new URLSearchParams(params.toString())
    if (p === 1) next.delete('page')
    else next.set('page', String(p))
    return `/listings${next.toString() ? `?${next.toString()}` : ''}`
  }

  // Show: first, prev, current ±2, next, last
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1, page - 2, page + 2])
  const sortedPages = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)

  const baseClass =
    'h-9 min-w-9 px-3 text-[13px] font-semibold flex items-center justify-center border transition-colors'

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Paginación">
      {page > 1 && (
        <Link href={buildHref(page - 1)} className={`${baseClass} border-soft hover:border-ink`}>
          ←
        </Link>
      )}
      {sortedPages.map((p, i) => {
        const prev = sortedPages[i - 1]
        const showEllipsis = prev != null && p - prev > 1
        const active = p === page
        return (
          <span key={p} className="contents">
            {showEllipsis && <span className="text-muted px-1">…</span>}
            <Link
              href={buildHref(p)}
              className={`${baseClass} ${
                active
                  ? 'bg-ink text-cream border-ink'
                  : 'border-soft hover:border-ink text-ink'
              }`}
            >
              {p}
            </Link>
          </span>
        )
      })}
      {page < totalPages && (
        <Link href={buildHref(page + 1)} className={`${baseClass} border-soft hover:border-ink`}>
          →
        </Link>
      )}
    </nav>
  )
}
