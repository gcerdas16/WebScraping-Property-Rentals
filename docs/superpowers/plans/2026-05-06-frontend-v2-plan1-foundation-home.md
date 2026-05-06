# Frontend V2 — Plan 1: Foundation + Home Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un home page deployable con el hero Stat-Driven (496.) y la sección "Recién hoy", en el estilo Editorial con acentos bold (lima `#84cc16`).

**Architecture:** Next.js 14 App Router en proyecto nuevo. Server components por default (data fetching directo desde Supabase con anon key respetando RLS). Client components solo donde haya interactividad (favoritos en localStorage). Tipografía vía `next/font` + Google Fonts (DM Serif Display, Fraunces, Inter). framer-motion para animaciones component-level. GSAP queda para Plan 3 (polish).

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, `@supabase/supabase-js`, `framer-motion`, `vitest` + `@testing-library/react`, `next/font`.

**Spec referenciado:** `docs/superpowers/specs/2026-05-06-frontend-v2-redesign-design.md`

**No incluido en este plan (queda para Plan 2/3):** páginas `/listings`, `/listings/[id]`, `/nuevos`, `/favoritos`, mapa Leaflet, animaciones GSAP avanzadas.

---

## File Structure (Plan 1)

Archivos a crear:

```
cr-market-frontend/                              # NUEVO proyecto (post-archive)
├── .env.local                                   # gitignored, copia de v1
├── next.config.mjs                              # imageDomains para Cloudinary
├── tailwind.config.ts                           # design tokens
├── tsconfig.json                                # path alias @/
├── vitest.config.ts                             # test setup
├── src/
│   ├── app/
│   │   ├── globals.css                          # tailwind + base
│   │   ├── layout.tsx                           # fonts + Navbar + Footer
│   │   └── page.tsx                             # home composition
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── ListingCard.tsx                      # card visual
│   │   ├── FavoriteButton.tsx                   # client, toggle favorito
│   │   └── home/
│   │       ├── Hero.tsx                         # Stat-Driven 496
│   │       ├── RecienHoy.tsx                    # grid 3x2
│   │       ├── Ciudades.tsx                     # tiles por ciudad
│   │       └── WhatsAppCTA.tsx                  # banner CTA
│   ├── lib/
│   │   ├── supabase.ts                          # client singleton
│   │   ├── formatters.ts                        # formatPrice, formatTimeSince
│   │   └── queries.ts                           # data fetching helpers
│   ├── hooks/
│   │   └── useFavorites.ts                      # localStorage favorites
│   └── types/
│       └── listing.ts                           # Listing + helpers
└── tests/
    ├── setup.ts                                 # vitest setup
    ├── lib/
    │   └── formatters.test.ts
    └── hooks/
        └── useFavorites.test.tsx
```

Archivos a renombrar (archive):

```
cr-market-frontend/        →  cr-market-frontend-v1-realpro/
```

---

## Phase 0: Setup del proyecto

### Task 0.1: Archivar el frontend actual

**Files:**
- Rename: `cr-market-frontend/` → `cr-market-frontend-v1-realpro/`

- [ ] **Step 1: Renombrar la carpeta**

```bash
cd "C:/Users/cerdascg/12.Gustavo/2. Scraping"
mv cr-market-frontend cr-market-frontend-v1-realpro
```

- [ ] **Step 2: Verificar el rename**

```bash
ls -d cr-market-frontend-v1-realpro
```

Expected: `cr-market-frontend-v1-realpro` aparece. La carpeta `cr-market-frontend` ya no existe.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(frontend): archive v1 RealPro implementation as cr-market-frontend-v1-realpro"
```

---

### Task 0.2: Crear nuevo proyecto Next.js

**Files:**
- Create: `cr-market-frontend/` (boilerplate vía create-next-app)

- [ ] **Step 1: Crear el proyecto con create-next-app**

```bash
cd "C:/Users/cerdascg/12.Gustavo/2. Scraping"
npx create-next-app@latest cr-market-frontend --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint --no-turbopack
```

Cuando pregunte:
- TypeScript? **Yes**
- ESLint? **Yes**
- Tailwind CSS? **Yes**
- `src/`? **Yes**
- App Router? **Yes**
- Turbopack? **No**
- Customize import alias? **Yes** → `@/*`

- [ ] **Step 2: Verificar que arranca**

```bash
cd cr-market-frontend
npm run dev
```

Expected: dev server arranca en http://localhost:3000 mostrando el splash de Next.js.

- [ ] **Step 3: Detener el dev server (Ctrl+C) y commit**

```bash
cd ..
git add cr-market-frontend/
git commit -m "feat(frontend): scaffold new Next.js 14 project for V2"
```

---

### Task 0.3: Instalar dependencias del proyecto

**Files:**
- Modify: `cr-market-frontend/package.json`

- [ ] **Step 1: Instalar runtime deps**

```bash
cd "C:/Users/cerdascg/12.Gustavo/2. Scraping/cr-market-frontend"
npm install @supabase/supabase-js framer-motion clsx
```

- [ ] **Step 2: Instalar dev deps (testing)**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/node
```

- [ ] **Step 3: Verificar `package.json` tiene las deps**

Run: `cat package.json | grep -E "supabase|framer|vitest|testing-library"`
Expected: las 5 dependencias aparecen.

- [ ] **Step 4: Commit**

```bash
cd ..
git add cr-market-frontend/package.json cr-market-frontend/package-lock.json
git commit -m "feat(frontend): add Supabase, framer-motion, vitest deps"
```

---

### Task 0.4: Copiar variables de entorno desde v1

**Files:**
- Create: `cr-market-frontend/.env.local` (gitignored)

- [ ] **Step 1: Copiar el .env.local de v1**

```bash
cp "C:/Users/cerdascg/12.Gustavo/2. Scraping/cr-market-frontend-v1-realpro/.env.local" "C:/Users/cerdascg/12.Gustavo/2. Scraping/cr-market-frontend/.env.local"
```

- [ ] **Step 2: Verificar contenido**

Run: `cat cr-market-frontend/.env.local`
Expected: contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

No commit — `.env.local` está gitignored al nivel root.

---

### Task 0.5: Configurar `next.config.mjs` para imágenes de Cloudinary

**Files:**
- Modify: `cr-market-frontend/next.config.mjs`

- [ ] **Step 1: Reemplazar el contenido de `next.config.mjs`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verificar que el dev server arranca sin errores**

```bash
npm run dev
```

Expected: arranca sin errores.

Detener (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/next.config.mjs
git commit -m "feat(frontend): configure Cloudinary image domain"
```

---

### Task 0.6: Configurar Vitest

**Files:**
- Create: `cr-market-frontend/vitest.config.ts`
- Create: `cr-market-frontend/tests/setup.ts`
- Modify: `cr-market-frontend/package.json` (add test script)

- [ ] **Step 1: Crear `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Crear `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Agregar script `test` a `package.json`**

Editar `package.json` y agregar en `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar vitest corre (sin tests aún)**

```bash
npm test
```

Expected: "No test files found." Sin error.

- [ ] **Step 5: Commit**

```bash
cd ..
git add cr-market-frontend/vitest.config.ts cr-market-frontend/tests/ cr-market-frontend/package.json
git commit -m "feat(frontend): set up vitest for testing"
```

---

## Phase 1: Design System

### Task 1.1: Configurar Tailwind con design tokens

**Files:**
- Modify: `cr-market-frontend/tailwind.config.ts`

- [ ] **Step 1: Reemplazar `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#fafaf7',
        ink: '#1a1a1a',
        muted: '#4a4a4a',
        soft: '#e5e5e0',
        accent: '#84cc16',
      },
      fontFamily: {
        display: ['var(--font-dm-serif-display)', 'serif'],
        serif: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'editorial': '-0.04em',
        'mega': '-0.06em',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Verificar que no hay error de TypeScript**

```bash
cd cr-market-frontend
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/tailwind.config.ts
git commit -m "feat(frontend): add design tokens (colors, fonts) to Tailwind"
```

---

### Task 1.2: Configurar Google Fonts en root layout

**Files:**
- Modify: `cr-market-frontend/src/app/layout.tsx`

- [ ] **Step 1: Reemplazar `src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter, Fraunces, DM_Serif_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-dm-serif-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CR Market — Alquileres curados en Costa Rica',
  description: 'Casas y apartamentos en alquiler en Costa Rica. Curados, con precios normalizados, recién listados primero.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} ${dmSerifDisplay.variable}`}>
      <body className="bg-cream text-ink font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd cr-market-frontend
npm run build
```

Expected: build exitoso, sin errores. (Puede tardar la primera vez por las fuentes.)

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/app/layout.tsx
git commit -m "feat(frontend): set up DM Serif Display, Fraunces, Inter via next/font"
```

---

### Task 1.3: Configurar `globals.css`

**Files:**
- Modify: `cr-market-frontend/src/app/globals.css`

- [ ] **Step 1: Reemplazar `globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-cream text-ink;
  }

  ::selection {
    @apply bg-accent text-ink;
  }
}

@layer utilities {
  .text-mega {
    @apply font-display tracking-mega leading-[0.85];
  }
}
```

- [ ] **Step 2: Verificar dev server visual**

```bash
cd cr-market-frontend
npm run dev
```

Abrir http://localhost:3000. Esperado: fondo crema (`#fafaf7`), no más blanco puro.

Detener (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/app/globals.css
git commit -m "feat(frontend): set base styles and Tailwind directives"
```

---

## Phase 2: Data Layer

### Task 2.1: Definir el tipo `Listing`

**Files:**
- Create: `cr-market-frontend/src/types/listing.ts`

- [ ] **Step 1: Crear `src/types/listing.ts`**

```typescript
export interface Listing {
  source_id: string
  title: string
  description: string | null
  price_final_crc: number | null
  price_final_usd: number | null
  location_city: string | null
  location_province: string | null
  location_latitude: number | null
  location_longitude: number | null
  bedrooms_ai: number | null
  bathrooms_ai: number | null
  image_urls: string[] | null
  property_type_ai: string | null
  furnished: boolean | null
  pets_allowed: boolean | null
  parking: boolean | null
  contact_phone: string | null
  created_at: string
  last_seen_at: string | null
}

export type FavoriteId = string
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd cr-market-frontend
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/types/listing.ts
git commit -m "feat(frontend): add Listing TypeScript type"
```

---

### Task 2.2: Crear cliente de Supabase

**Files:**
- Create: `cr-market-frontend/src/lib/supabase.ts`

- [ ] **Step 1: Crear `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
})
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/lib/supabase.ts
git commit -m "feat(frontend): add Supabase client singleton"
```

---

### Task 2.3: Verificar valores de `property_type_ai` en DB

**Files:** ninguno (tarea de diagnóstico)

- [ ] **Step 1: Crear un script temporal para listar property_types**

Crear archivo temporal `cr-market-frontend/scripts/check-property-types.mjs`:

```javascript
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [k, v] = line.split('=')
    if (k && v) acc[k.trim()] = v.trim()
    return acc
  }, {})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const { data, error } = await supabase
  .from('listings')
  .select('property_type_ai')
  .eq('is_active', true)
  .eq('is_published', true)

if (error) { console.error(error); process.exit(1) }

const counts = {}
for (const row of data) {
  const k = row.property_type_ai || '(null)'
  counts[k] = (counts[k] || 0) + 1
}

console.table(Object.entries(counts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count))
```

- [ ] **Step 2: Correr el script**

```bash
cd cr-market-frontend
node scripts/check-property-types.mjs
```

Expected: tabla con tipos de propiedad y conteos.

- [ ] **Step 3: Documentar el set de tipos a usar como filtro V1**

Crear `cr-market-frontend/src/lib/filters.ts`:

```typescript
// Set de property_type_ai que califican como "casa o apartamento" para V1.
// Verificado en DB el 2026-05-06 — actualizar si los valores cambian.
export const RENTAL_PROPERTY_TYPES = [
  'Casa',
  'Apartamento',
  'Townhouse',
  'Estudio',
] as const

export type RentalPropertyType = typeof RENTAL_PROPERTY_TYPES[number]
```

**IMPORTANTE:** ajustar el array según los valores reales que mostró el script. Si aparecen variantes como "Apto", "Apto.", "casa" (minúscula), incluirlos. Si NO aparecen "Townhouse" o "Estudio", quitarlos.

- [ ] **Step 4: Borrar el script temporal**

```bash
rm scripts/check-property-types.mjs
```

- [ ] **Step 5: Commit**

```bash
cd ..
git add cr-market-frontend/src/lib/filters.ts
git commit -m "feat(frontend): lock property_type_ai filter set for V1 (casas + apartamentos)"
```

---

### Task 2.4: Implementar `formatters.ts` con tests TDD

**Files:**
- Create: `cr-market-frontend/src/lib/formatters.ts`
- Create: `cr-market-frontend/tests/lib/formatters.test.ts`

- [ ] **Step 1: Escribir tests fallidos en `tests/lib/formatters.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { formatPrice, formatTimeSince } from '@/lib/formatters'

describe('formatPrice', () => {
  it('formats CRC with thousand separators and ₡ prefix', () => {
    expect(formatPrice({ crc: 320000, usd: null })).toBe('₡320.000')
  })

  it('formats USD with $ prefix when only USD available', () => {
    expect(formatPrice({ crc: null, usd: 650 })).toBe('$650')
  })

  it('prefers CRC when both available', () => {
    expect(formatPrice({ crc: 320000, usd: 650 })).toBe('₡320.000')
  })

  it('returns "Consultar" when both null', () => {
    expect(formatPrice({ crc: null, usd: null })).toBe('Consultar')
  })
})

describe('formatTimeSince', () => {
  const now = new Date('2026-05-06T12:00:00Z')

  it('returns "Hace Xh" for hours', () => {
    const past = new Date('2026-05-06T10:00:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hace 2h')
  })

  it('returns "Hace Xm" for minutes', () => {
    const past = new Date('2026-05-06T11:30:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hace 30m')
  })

  it('returns "Hoy" when same day and within last 24h', () => {
    const past = new Date('2026-05-06T00:30:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hoy')
  })

  it('returns "Hace X días" for days', () => {
    const past = new Date('2026-05-04T12:00:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hace 2 días')
  })

  it('returns "Hace 1 día" singular', () => {
    const past = new Date('2026-05-05T12:00:00Z').toISOString()
    expect(formatTimeSince(past, now)).toBe('Hace 1 día')
  })
})
```

- [ ] **Step 2: Correr tests, verificar que fallan**

```bash
cd cr-market-frontend
npm test
```

Expected: FAIL — `formatPrice is not a function` y `formatTimeSince is not a function`.

- [ ] **Step 3: Implementar `src/lib/formatters.ts`**

```typescript
type PriceInput = {
  crc: number | null
  usd: number | null
}

export function formatPrice({ crc, usd }: PriceInput): string {
  if (crc != null) {
    const formatted = crc.toLocaleString('es-CR', { useGrouping: true }).replace(/,/g, '.')
    return `₡${formatted}`
  }
  if (usd != null) {
    return `$${usd}`
  }
  return 'Consultar'
}

export function formatTimeSince(isoDate: string, now: Date = new Date()): string {
  const past = new Date(isoDate)
  const diffMs = now.getTime() - past.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffHour < 1) return `Hace ${diffMin}m`
  if (diffHour < 6) return `Hace ${diffHour}h`
  if (diffDay < 1) return 'Hoy'
  if (diffDay === 1) return 'Hace 1 día'
  return `Hace ${diffDay} días`
}
```

Nota: `formatPrice` para CRC usa `'es-CR'` con grouping (que en es-CR usa coma como separador de miles, pero el spec quiere PUNTO). Por eso el `.replace(/,/g, '.')`. Verificar que pasa los tests.

- [ ] **Step 4: Correr tests, verificar que pasan**

```bash
npm test
```

Expected: PASS — todos los tests verdes (5 tests).

- [ ] **Step 5: Commit**

```bash
cd ..
git add cr-market-frontend/src/lib/formatters.ts cr-market-frontend/tests/lib/formatters.test.ts
git commit -m "feat(frontend): add formatPrice and formatTimeSince with tests"
```

---

### Task 2.5: Implementar queries para home page

**Files:**
- Create: `cr-market-frontend/src/lib/queries.ts`

- [ ] **Step 1: Crear `src/lib/queries.ts`**

```typescript
import { supabase } from './supabase'
import { RENTAL_PROPERTY_TYPES } from './filters'
import type { Listing } from '@/types/listing'

/** Cuenta total de listings activos y publicados en V1 (casas + apartamentos). */
export async function getActiveListingsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('listings')
    .select('source_id', { count: 'exact', head: true })
    .in('property_type_ai', RENTAL_PROPERTY_TYPES as unknown as string[])

  if (error) {
    console.error('getActiveListingsCount:', error)
    return 0
  }
  return count ?? 0
}

/** Listings más recientes para la sección "Recién hoy" del home. */
export async function getRecentListings(limit = 6): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .in('property_type_ai', RENTAL_PROPERTY_TYPES as unknown as string[])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getRecentListings:', error)
    return []
  }
  return (data ?? []) as Listing[]
}

/** Top ciudades con conteo de listings, para sección "Por ciudad" del home. */
export async function getCitiesWithCounts(limit = 6): Promise<Array<{ city: string; count: number }>> {
  const { data, error } = await supabase
    .from('listings')
    .select('location_city')
    .in('property_type_ai', RENTAL_PROPERTY_TYPES as unknown as string[])
    .not('location_city', 'is', null)

  if (error) {
    console.error('getCitiesWithCounts:', error)
    return []
  }

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const city = (row as { location_city: string | null }).location_city
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd cr-market-frontend
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/lib/queries.ts
git commit -m "feat(frontend): add home page queries (count, recent, cities)"
```

---

### Task 2.6: Implementar `useFavorites` hook con tests

**Files:**
- Create: `cr-market-frontend/src/hooks/useFavorites.ts`
- Create: `cr-market-frontend/tests/hooks/useFavorites.test.tsx`

- [ ] **Step 1: Escribir test fallidos en `tests/hooks/useFavorites.test.tsx`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFavorites } from '@/hooks/useFavorites'

describe('useFavorites', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with empty favorites', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual([])
    expect(result.current.isFavorite('abc')).toBe(false)
  })

  it('adds a favorite', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => {
      result.current.toggle('abc')
    })
    expect(result.current.favorites).toEqual(['abc'])
    expect(result.current.isFavorite('abc')).toBe(true)
  })

  it('removes a favorite when toggled twice', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.toggle('abc'))
    act(() => result.current.toggle('abc'))
    expect(result.current.favorites).toEqual([])
    expect(result.current.isFavorite('abc')).toBe(false)
  })

  it('persists favorites to localStorage', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.toggle('abc'))
    expect(JSON.parse(localStorage.getItem('cr-market.favorites') ?? '[]')).toEqual(['abc'])
  })

  it('reads existing favorites from localStorage on mount', () => {
    localStorage.setItem('cr-market.favorites', JSON.stringify(['xyz', '123']))
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual(['xyz', '123'])
  })
})
```

- [ ] **Step 2: Correr tests, verificar que fallan**

```bash
cd cr-market-frontend
npm test
```

Expected: FAIL — `useFavorites is not exported`.

- [ ] **Step 3: Implementar `src/hooks/useFavorites.ts`**

```typescript
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

  // Hydrate desde localStorage en mount
  useEffect(() => {
    setFavorites(readFavorites())
  }, [])

  const isFavorite = useCallback((id: FavoriteId) => favorites.includes(id), [favorites])

  const toggle = useCallback((id: FavoriteId) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      writeFavorites(next)
      return next
    })
  }, [])

  return { favorites, isFavorite, toggle }
}
```

- [ ] **Step 4: Correr tests, verificar que pasan**

```bash
npm test
```

Expected: PASS — los 5 tests de `useFavorites` verdes.

- [ ] **Step 5: Commit**

```bash
cd ..
git add cr-market-frontend/src/hooks/useFavorites.ts cr-market-frontend/tests/hooks/useFavorites.test.tsx
git commit -m "feat(frontend): add useFavorites hook with localStorage persistence"
```

---

## Phase 3: Layout Components

### Task 3.1: Implementar Navbar

**Files:**
- Create: `cr-market-frontend/src/components/Navbar.tsx`

- [ ] **Step 1: Crear `src/components/Navbar.tsx`**

```typescript
import Link from 'next/link'

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur border-b border-soft">
      <nav className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">CR</span>
          <span className="font-serif text-xl font-bold tracking-tight">Market</span>
        </Link>

        <div className="flex items-center gap-8 text-sm">
          <Link href="/listings" className="hover:text-accent transition-colors">Propiedades</Link>
          <Link href="/nuevos" className="hover:text-accent transition-colors">Recién hoy</Link>
          <Link href="/favoritos" className="hover:text-accent transition-colors">Favoritos</Link>
        </div>
      </nav>
    </header>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd cr-market-frontend
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/components/Navbar.tsx
git commit -m "feat(frontend): add Navbar component"
```

---

### Task 3.2: Implementar Footer

**Files:**
- Create: `cr-market-frontend/src/components/Footer.tsx`

- [ ] **Step 1: Crear `src/components/Footer.tsx`**

```typescript
import Link from 'next/link'

const WHATSAPP_CHANNEL_URL = 'https://chat.whatsapp.com/PLACEHOLDER'

export function Footer() {
  return (
    <footer className="bg-ink text-cream mt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 grid grid-cols-2 md:grid-cols-4 gap-12">
        <div className="col-span-2">
          <div className="font-serif text-2xl font-bold tracking-tight">CR Market</div>
          <p className="mt-3 text-sm text-cream/70 max-w-xs leading-relaxed">
            Casas y apartamentos curados en Costa Rica. Sin scroll en Facebook.
          </p>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex mt-6 bg-accent text-ink px-5 py-2.5 text-sm font-bold tracking-wide hover:bg-accent/90 transition-colors"
          >
            Canal de WhatsApp
          </a>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cream/50 font-semibold">Explorar</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/listings" className="hover:text-accent">Todas las propiedades</Link></li>
            <li><Link href="/nuevos" className="hover:text-accent">Recién listadas</Link></li>
            <li><Link href="/favoritos" className="hover:text-accent">Mis favoritos</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cream/50 font-semibold">CR Market</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><span className="text-cream/40">Acerca de (próximamente)</span></li>
            <li><span className="text-cream/40">Contacto (próximamente)</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 text-xs text-cream/50">
          © {new Date().getFullYear()} CR Market. Datos curados desde Facebook Marketplace.
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/components/Footer.tsx
git commit -m "feat(frontend): add Footer with WhatsApp CTA placeholder"
```

---

### Task 3.3: Integrar Navbar y Footer en root layout

**Files:**
- Modify: `cr-market-frontend/src/app/layout.tsx`

- [ ] **Step 1: Reemplazar `src/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter, Fraunces, DM_Serif_Display } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
})

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-dm-serif-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CR Market — Alquileres curados en Costa Rica',
  description: 'Casas y apartamentos en alquiler en Costa Rica. Curados, con precios normalizados, recién listados primero.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} ${dmSerifDisplay.variable}`}>
      <body className="bg-cream text-ink font-sans antialiased min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Visualizar en dev server**

```bash
npm run dev
```

Abrir http://localhost:3000. Esperado:
- Navbar sticky arriba con "CR Market" + 3 links
- Footer oscuro abajo con 3 columnas y CTA WhatsApp

Detener (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/app/layout.tsx
git commit -m "feat(frontend): integrate Navbar and Footer in root layout"
```

---

## Phase 4: ListingCard

### Task 4.1: Implementar FavoriteButton (client)

**Files:**
- Create: `cr-market-frontend/src/components/FavoriteButton.tsx`

- [ ] **Step 1: Crear `src/components/FavoriteButton.tsx`**

```typescript
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
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd cr-market-frontend
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/components/FavoriteButton.tsx
git commit -m "feat(frontend): add FavoriteButton (client component with localStorage)"
```

---

### Task 4.2: Implementar ListingCard

**Files:**
- Create: `cr-market-frontend/src/components/ListingCard.tsx`

- [ ] **Step 1: Crear `src/components/ListingCard.tsx`**

```typescript
import Image from 'next/image'
import Link from 'next/link'
import { FavoriteButton } from './FavoriteButton'
import { formatPrice, formatTimeSince } from '@/lib/formatters'
import type { Listing } from '@/types/listing'

export function ListingCard({ listing }: { listing: Listing }) {
  const photo = listing.image_urls?.[0]
  const price = formatPrice({ crc: listing.price_final_crc, usd: listing.price_final_usd })
  const since = formatTimeSince(listing.created_at)
  const cityProvince = [listing.location_city, listing.location_province].filter(Boolean).join(', ')

  return (
    <Link href={`/listings/${listing.source_id}`} className="group block relative">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {photo ? (
          <Image
            src={photo}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-soft flex items-center justify-center text-muted text-xs">Sin foto</div>
        )}

        <span className="absolute top-3 left-3 z-10 bg-accent text-ink px-2 py-1 text-[10px] font-bold tracking-[0.15em] uppercase">
          {since}
        </span>

        <FavoriteButton id={listing.source_id} />

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-cream">
          <div className="font-bold text-base">{price}{price !== 'Consultar' && <span className="text-xs font-normal opacity-80">/mes</span>}</div>
          {cityProvince && <div className="text-xs opacity-85 mt-0.5">{cityProvince}</div>}
        </div>
      </div>

      <div className="mt-3">
        <h3 className="font-serif font-bold text-base leading-snug line-clamp-2 group-hover:text-muted transition-colors">
          {listing.title}
        </h3>
        <div className="mt-1 text-xs text-muted flex gap-3">
          {listing.bedrooms_ai != null && <span>{listing.bedrooms_ai} cuartos</span>}
          {listing.bathrooms_ai != null && <span>{listing.bathrooms_ai} baños</span>}
          {listing.property_type_ai && <span>{listing.property_type_ai}</span>}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/components/ListingCard.tsx
git commit -m "feat(frontend): add ListingCard with favorite and timestamp"
```

---

## Phase 5: Home Sections

### Task 5.1: Implementar Hero (Stat-Driven)

**Files:**
- Create: `cr-market-frontend/src/components/home/Hero.tsx`

- [ ] **Step 1: Crear `src/components/home/Hero.tsx`**

```typescript
import { getActiveListingsCount } from '@/lib/queries'

const WHATSAPP_CHANNEL_URL = 'https://chat.whatsapp.com/PLACEHOLDER'

export async function Hero() {
  const count = await getActiveListingsCount()

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="text-[10px] md:text-[11px] tracking-[0.4em] uppercase font-bold text-ink mb-3">
          CR Market
        </div>

        <h1 className="font-display text-[100px] md:text-[170px] leading-[0.85] tracking-mega text-ink">
          {count}<span className="text-accent">.</span>
        </h1>

        <div className="font-display italic text-2xl md:text-[28px] mt-2 leading-tight text-ink">
          propiedades curadas en Costa Rica.
        </div>

        <p className="mt-6 max-w-xl text-sm md:text-base leading-relaxed text-muted">
          Sin scroll infinito en Facebook. Sin calculadora para convertir dólares. Sin estafadores. Solo casas y apartamentos en alquiler — recién listados primero.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/listings"
            className="bg-ink text-cream px-7 py-3.5 text-sm font-semibold tracking-wide hover:bg-muted transition-colors"
          >
            Ver propiedades →
          </a>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent text-ink px-7 py-3.5 text-sm font-bold tracking-wide hover:bg-accent/90 transition-colors"
          >
            Canal WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Visualizar en dev server**

```bash
cd cr-market-frontend
npm run dev
```

Abrir http://localhost:3000 (después de la próxima task que monta el componente). Por ahora solo verificar que TypeScript compila.

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/components/home/Hero.tsx
git commit -m "feat(frontend): add Stat-Driven Hero (B2) with dynamic count"
```

---

### Task 5.2: Implementar RecienHoy section

**Files:**
- Create: `cr-market-frontend/src/components/home/RecienHoy.tsx`

- [ ] **Step 1: Crear `src/components/home/RecienHoy.tsx`**

```typescript
import { getRecentListings } from '@/lib/queries'
import { ListingCard } from '@/components/ListingCard'

export async function RecienHoy() {
  const listings = await getRecentListings(6)

  if (listings.length === 0) return null

  return (
    <section className="bg-white border-t border-soft">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-accent">
              Recién hoy
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mt-2 leading-none">
              Listadas hace menos de 24h
            </h2>
          </div>
          <a href="/nuevos" className="text-sm font-semibold underline hover:text-muted transition-colors">
            Ver todas →
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {listings.map(listing => (
            <ListingCard key={listing.source_id} listing={listing} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/components/home/RecienHoy.tsx
git commit -m "feat(frontend): add RecienHoy section with 6-card grid"
```

---

### Task 5.3: Implementar Ciudades section

**Files:**
- Create: `cr-market-frontend/src/components/home/Ciudades.tsx`

- [ ] **Step 1: Crear `src/components/home/Ciudades.tsx`**

```typescript
import Link from 'next/link'
import { getCitiesWithCounts } from '@/lib/queries'

export async function Ciudades() {
  const cities = await getCitiesWithCounts(6)

  if (cities.length === 0) return null

  return (
    <section className="bg-cream border-t border-soft">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 md:py-20">
        <div className="mb-10">
          <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-ink">
            Por ciudad
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mt-2 leading-none">
            ¿Dónde estás buscando?
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {cities.map(({ city, count }) => (
            <Link
              key={city}
              href={`/listings?city=${encodeURIComponent(city)}`}
              className="group bg-white border border-soft hover:border-ink p-5 transition-colors"
            >
              <div className="font-serif font-bold text-lg leading-tight group-hover:text-accent transition-colors">
                {city}
              </div>
              <div className="text-xs text-muted mt-1">
                {count} {count === 1 ? 'propiedad' : 'propiedades'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/components/home/Ciudades.tsx
git commit -m "feat(frontend): add Ciudades section with top cities and counts"
```

---

### Task 5.4: Implementar WhatsAppCTA

**Files:**
- Create: `cr-market-frontend/src/components/home/WhatsAppCTA.tsx`

- [ ] **Step 1: Crear `src/components/home/WhatsAppCTA.tsx`**

```typescript
const WHATSAPP_CHANNEL_URL = 'https://chat.whatsapp.com/PLACEHOLDER'

export function WhatsAppCTA() {
  return (
    <section className="bg-ink text-cream">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-[10px] tracking-[0.4em] uppercase font-bold text-accent">
            Canal de WhatsApp
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mt-3 leading-tight">
            Recibí lo nuevo apenas se lista, sin abrir esta página.
          </h2>
        </div>

        <div className="md:justify-self-end">
          <p className="text-sm text-cream/70 max-w-md mb-6 leading-relaxed">
            Posteo manualmente las propiedades nuevas al canal cada día. Sin spam, sin alertas que llegan tarde — solo lo que vale la pena ver.
          </p>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex bg-accent text-ink px-8 py-4 text-base font-bold tracking-wide hover:bg-accent/90 transition-colors"
          >
            Unirme al canal →
          </a>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd ..
git add cr-market-frontend/src/components/home/WhatsAppCTA.tsx
git commit -m "feat(frontend): add WhatsAppCTA banner section"
```

---

## Phase 6: Wire Home Page

### Task 6.1: Componer la home page

**Files:**
- Modify: `cr-market-frontend/src/app/page.tsx`

- [ ] **Step 1: Reemplazar `src/app/page.tsx`**

```typescript
import { Hero } from '@/components/home/Hero'
import { RecienHoy } from '@/components/home/RecienHoy'
import { Ciudades } from '@/components/home/Ciudades'
import { WhatsAppCTA } from '@/components/home/WhatsAppCTA'

export const revalidate = 300 // ISR: revalidar cada 5 min

export default function HomePage() {
  return (
    <>
      <Hero />
      <RecienHoy />
      <Ciudades />
      <WhatsAppCTA />
    </>
  )
}
```

- [ ] **Step 2: Visualizar en dev server**

```bash
cd cr-market-frontend
npm run dev
```

Abrir http://localhost:3000.

**Verificar visualmente:**
- Navbar sticky arriba
- Hero: "CR Market" label + número grande (ej: 496 si la DB tiene ese conteo) con punto verde lima + frase italic + párrafo + 2 botones
- Sección "Recién hoy": 6 cards en grid (3 columnas en desktop) con foto, badge timestamp lima, precio overlay, título serif
- Sección "Por ciudad": 6 tiles con ciudad + conteo
- Banner WhatsApp oscuro con CTA
- Footer oscuro al final

**Cosas a buscar como problemas:**
- Fonts no cargan (verificar que dice DM Serif Display en el número, no fallback)
- Imágenes no aparecen (verificar `next.config.mjs` Cloudinary)
- Conteo es `0` (verificar que el filtro de `RENTAL_PROPERTY_TYPES` matchea valores reales)
- Cards sin badge timestamp (verificar `created_at` en la DB)

Si todo se ve bien, detener (Ctrl+C).

- [ ] **Step 3: Build de producción para verificar que compila**

```bash
npm run build
```

Expected: build exitoso, sin errores.

- [ ] **Step 4: Commit**

```bash
cd ..
git add cr-market-frontend/src/app/page.tsx
git commit -m "feat(frontend): compose home page with Hero, RecienHoy, Ciudades, WhatsAppCTA"
```

---

### Task 6.2: Push final del Plan 1

- [ ] **Step 1: Push a GitHub**

```bash
cd "C:/Users/cerdascg/12.Gustavo/2. Scraping"
git push origin main
```

- [ ] **Step 2: Smoke test final**

```bash
cd cr-market-frontend
npm run dev
```

Navegar a http://localhost:3000.

**Checklist visual final:**
- [ ] El número del hero refleja el conteo real de DB (no es `0`)
- [ ] Los CTAs son `[Ver propiedades →]` (negro) y `[Canal WhatsApp]` (lima)
- [ ] La sección "Recién hoy" muestra 6 cards con fotos reales de Cloudinary
- [ ] Cada card tiene un badge "Hace Xh" o "Hoy" arriba
- [ ] El corazón en la card togglea favorito (verificar que cambia visualmente)
- [ ] La sección "Por ciudad" muestra ciudades reales con conteos
- [ ] El banner WhatsApp es oscuro con CTA lima
- [ ] El footer tiene 3 columnas y CTA WhatsApp
- [ ] Todo navegable a páginas que aún no existen (`/listings`, `/nuevos`, `/favoritos`) — devuelven 404, eso es OK por ahora

Detener (Ctrl+C).

---

## Resumen Plan 1

Al completar este plan tenés:
- Proyecto Next.js 14 nuevo en `cr-market-frontend/`
- v1 archivado en `cr-market-frontend-v1-realpro/`
- Design system: paleta crema + ink + lima, fuentes DM Serif Display + Fraunces + Inter
- Layer de datos: Supabase client, formatters, queries, useFavorites hook (todo testeado donde aplica)
- Componentes: Navbar, Footer, ListingCard, FavoriteButton
- Home page completa con 4 secciones
- Build de producción que compila

**Lo que falta para Plan 2:**
- Página `/listings` con filtros y mapa
- Página `/listings/[id]` (detalle)
- Mapa Leaflet integrado

**Lo que falta para Plan 3:**
- Páginas `/nuevos` y `/favoritos`
- Animaciones GSAP avanzadas (hero text-reveal, scroll-triggered)
- SEO básico, OG images, generateMetadata dinámico

---
