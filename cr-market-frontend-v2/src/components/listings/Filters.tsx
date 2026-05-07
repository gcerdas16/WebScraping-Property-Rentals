'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { RENTAL_PROPERTY_TYPES } from '@/lib/filters'

export function Filters({ cities }: { cities: string[] }) {
  const router = useRouter()
  const params = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (!value) next.delete(key)
      else next.set(key, value)
      next.delete('page') // reset pagination on any filter change
      router.push(`/listings${next.toString() ? `?${next.toString()}` : ''}`)
    },
    [params, router]
  )

  const reset = () => router.push('/listings')

  const inputClass =
    'h-10 px-3 text-[13px] border border-soft bg-white focus:outline-none focus:border-ink transition-colors'

  return (
    <div className="bg-cream border-b border-soft">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted">
            Tipo
          </label>
          <select
            value={params.get('type') ?? ''}
            onChange={(e) => setParam('type', e.target.value)}
            className={inputClass}
          >
            <option value="">Todas</option>
            {RENTAL_PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted">
            Ciudad
          </label>
          <select
            value={params.get('city') ?? ''}
            onChange={(e) => setParam('city', e.target.value)}
            className={inputClass}
          >
            <option value="">Todas</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted">
            Cuartos (mín)
          </label>
          <select
            value={params.get('bedrooms') ?? ''}
            onChange={(e) => setParam('bedrooms', e.target.value)}
            className={inputClass}
          >
            <option value="">Cualquiera</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted">
            Precio mín (CRC)
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="200000"
            defaultValue={params.get('priceMin') ?? ''}
            onBlur={(e) => setParam('priceMin', e.target.value)}
            className={`${inputClass} w-32`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] tracking-[0.25em] uppercase font-bold text-muted">
            Precio máx (CRC)
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="800000"
            defaultValue={params.get('priceMax') ?? ''}
            onBlur={(e) => setParam('priceMax', e.target.value)}
            className={`${inputClass} w-32`}
          />
        </div>

        <button
          type="button"
          onClick={reset}
          className="h-10 px-4 text-[12px] font-semibold underline text-ink hover:text-muted transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}
