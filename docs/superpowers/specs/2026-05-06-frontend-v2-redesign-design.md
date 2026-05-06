# CR Market Frontend V2 — Redesign Spec

**Fecha:** 2026-05-06
**Estado:** Aprobado, listo para plan de implementación
**Contexto previo:** El frontend actual (`cr-market-frontend/`) fue implementado pixel-perfect al template RealPro de Figma (Luxury Minimal/Modern). El usuario decidió que ese estilo no funciona y que falta atacar el dolor de "velocidad / no perderse oportunidades". Esta spec define V2.

---

## 1. Usuario y propuesta de valor

**Usuario tipo:** Gustavo de hace 6 años — 27 años, soltero, técnico, urbano, primera vez alquilando. Busca algo bonito en zona bonita. **Dolor central:** las propiedades buenas se van rápido, hay que estar pendiente horas para no perderlas.

**Propuesta de valor:** Encontrá tu primer apartamento sin estar pegado a Facebook 12 horas al día. Curaduría + recién listados + favoritos + mapa + canal de WhatsApp.

**No es para:** inversores buscando comprar, familias buscando casa grande, búsqueda de lotes/bodegas/locales.

---

## 2. Scope V1 — qué entra, qué no

### Entra
- Rediseño visual completo (Editorial con acentos bold)
- Páginas: `/`, `/listings`, `/listings/[source_id]`, `/nuevos` (nueva), `/favoritos` (nueva)
- Filtro de tipo de propiedad: solo Casas y Apartamentos en alquiler
- Favoritos en localStorage (sin auth)
- Timestamp visible en cada card
- **Mapa interactivo en `/listings`** (toggle Lista | Mapa) y mini-mapa en detalle
- CTA "Unirse al canal de WhatsApp" en hero/footer
- Archivo `cr-market-frontend/` → `cr-market-frontend-v1-realpro/` antes de empezar

### No entra (explícitamente)
- Auth de usuarios (email/password, Google, magic links)
- Alertas por email
- Comparar propiedades lado a lado (descartado a favor de favoritos)
- Búsqueda con AI / lenguaje natural (descartado por costo y falta de validación con usuarios)
- Páginas `/about` y `/contact` (siguen 404)
- Mapa con viewport-driven filtering (mover el mapa = refiltrar) — eso queda V2
- Marker clustering avanzado — V1 muestra markers individuales
- Floor plans, video, reviews
- Sign In / Sign Up / Reset Password
- Cualquier feature relacionado con compra/venta/lotes
- WhatsApp Business API o automatización del canal — el canal lo maneja el usuario manualmente, fuera del sitio

### Scraper y backend
Sin cambios. El scraper sigue trayendo todos los tipos de propiedad. El filtro de "solo casas/apartamentos" se aplica solo en queries del frontend.

---

## 3. Dirección visual

**Estilo:** Editorial con acentos bold (Opción 3 del brainstorming), variante hero Stat-Driven (B2).

### Paleta
- **Fondo:** `#fafaf7` (crema editorial) y `#ffffff`
- **Texto principal:** `#1a1a1a` (negro profundo)
- **Texto secundario:** `#4a4a4a`
- **Acento bold:** `#84cc16` (lima eléctrico) — usado en el punto del "496.", badges de "Hoy/Hace Xh", botón secundario WhatsApp, hover states, accent en section labels

### Tipografía
- **`DM Serif Display`** — solo para el número gigante del hero (el "496"). Display heavy serif.
- **`Fraunces`** (variable serif) — section titles, subheads italic ("propiedades curadas en Costa Rica."), card headlines
- **`Inter`** (sans) — body, UI, labels, botones, metadata

### Animaciones
- **framer-motion** — animaciones component-level (hover en cards, page transitions, list stagger en grids, fade-in de secciones)
- **GSAP** — animaciones pesadas: hero text-reveal cinematic del "496", scroll-triggered en sección "Recién hoy", timelines complejos
- **NO anime.js** — redundante con GSAP

---

## 4. Páginas

| Ruta | Estado | Notas |
|---|---|---|
| `/` | Rediseño completo | Hero Stat-Driven (B2) + sección "Recién hoy" + "Por ciudad" + CTA WhatsApp |
| `/listings` | Rediseño | Filtros + toggle **Lista \| Mapa** + grid + paginación. Solo casas/apartamentos |
| `/listings/[source_id]` | Rediseño | Galería + info + favorito + mini-mapa + listings similares |
| `/nuevos` | Nueva | Feed cronológico de últimos 7 días con timestamps |
| `/favoritos` | Nueva | Listings marcados como favoritos (localStorage) |
| `/about`, `/contact` | NO en V1 | Quedan 404 |

### Estructura del hero `/` (B2 — Stat-Driven)

**Hero (limpio, sin imágenes):**
- Label "CR Market" pequeño en uppercase
- "496." en DM Serif Display gigante (~130-150px), el punto en lima `#84cc16`
- "propiedades curadas en Costa Rica." en Fraunces italic, ~24-28px
- Párrafo subhead en Inter ~14-15px: "Sin scroll en Facebook. Sin calculadora para dólares. Solo casas y apartamentos en alquiler — recién listados primero."
- Dos CTAs: `[Ver propiedades →]` (negro) + `[Canal WhatsApp]` (lima)
- El número 496 es dinámico: cuenta de listings activos en DB, se actualiza en cada render

**Sección inmediatamente debajo: "Recién hoy"**
- Section label "RECIÉN HOY" en lima eléctrico, uppercase, letter-spacing alto
- Section title en Fraunces serif: "Listadas hace menos de 24h"
- Link "Ver todas →" alineado a la derecha
- Grid 3x2 de 6 photo cards, cada una con:
  - Foto del listing (de Cloudinary)
  - Badge timestamp en lima ("Hace 2h", "Hoy", etc.)
  - Precio + ubicación overlay sobre gradiente
  - Click navega al detalle

---

## 5. Features nuevos

### Favoritos (sin auth)
- Corazón en cada card de listing
- Click toggleea favorito
- Persiste en `localStorage` (sin servidor, sin auth)
- Página `/favoritos` muestra lista
- **Limitación conocida:** si el usuario cambia de dispositivo se pierde. Aceptable para V1.

### Timestamp visible
- Cada card muestra "Listado hace Xh / X días"
- En el detalle también visible
- Decidir al implementar si usa `created_at` o `last_seen_at`

### Recién listados
- Sección destacada en home (`/`) con los últimos 6 listings
- Página `/nuevos` con feed cronológico inverso de últimos 7 días
- Filtros aplicables encima

### Filtro V1 — solo casas/apartamentos
- Query a Supabase filtra `property_type_ai IN (...)`
- Valores exactos a determinar al implementar (probablemente: 'Casa', 'Apartamento', 'Townhouse', 'Estudio' — verificar en DB antes)

### Mapa de propiedades
- **En `/listings`:** toggle "Lista | Mapa". El mapa muestra los listings ya filtrados como markers. Click en marker abre popup con preview (foto, precio, título, link al detalle)
- **En `/listings/[source_id]`:** mini-mapa estático con marker de la propiedad
- **Tecnología:** Leaflet + OpenStreetMap (gratis, sin API key)
- **NO en V1:** viewport-driven filtering, marker clustering avanzado
- **Fuente de coordenadas:** `location_latitude` y `location_longitude` de la DB

### CTA WhatsApp
- Botón prominente "Unirse al canal" en hero y footer
- URL placeholder hasta que el usuario cree el canal y la provea
- Sin integración técnica con WhatsApp — solo es un link

---

## 6. Photography strategy

- **Listings:** fotos reales de la DB (Cloudinary URLs ya almacenados en `image_urls`)
- **Hero, secciones decorativas:** NO stock photos genéricos. Estrategia preferida:
  - Usar fotos reales de un par de listings curados como hero (rotando o estático)
  - Aprovechar la propia data como visual
  - Plan B si calidad insuficiente: 1-2 fotos cuidadas de Unsplash con licencia (arquitectura tropical/CR), no decoración random

**Decisión a tomar al implementar:** hero estático con 1 foto vs carousel de 3.

---

## 7. Referencia Figma

**Regla:** Usar Figma RealPro (`fileKey: zQNAW5NXpChU2Bd9fKSARU`) como referencia de información architecture y page structure. NO usar como referencia visual.

- **Sí tomar:** estructura de páginas, qué secciones existen, cómo se organiza la jerarquía, composición de cards (qué info y en qué orden), layout del detalle
- **No tomar:** estilo visual, colores, tipografías, componentes literales

**Razón:** RealPro tiene UX research detrás de su arquitectura, pero su estilo Luxury Minimal no es lo que el usuario quiere. Reutilizar IA sin reusar visual evita reinventar la rueda y garantiza diferenciación visual.

---

## 8. Stack técnico

### Mantener
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase JS (anon key, respeta RLS: solo `is_active=true AND is_published=true`)

### Agregar
- `framer-motion` — animaciones component-level
- `gsap` — animaciones timeline / scroll-driven
- `leaflet` + `react-leaflet` — mapa
- `shadcn/ui` — componentes base (botones, dialog, sheet, etc.)
- `next/font` — Google Fonts (Fraunces + Inter o equivalente)

### No agregar
- `animejs` (redundante con GSAP)
- Librerías de auth (NextAuth, Clerk, etc.)
- Librerías de email (Resend, SendGrid, etc.)
- Cron / scheduled tasks
- SDK de Google Maps / Mapbox (Leaflet alcanza para V1)

---

## 9. Plan de archivo

Antes de empezar V2:
1. Renombrar `cr-market-frontend/` → `cr-market-frontend-v1-realpro/`
2. Crear nuevo `cr-market-frontend/` con `npx create-next-app` (TypeScript + Tailwind + App Router)
3. Configurar `.env.local` con las mismas variables de Supabase

El v1 archivado queda intacto como referencia y safety net. Si V2 se descarrila, se puede volver al estado actual.

---

## 10. Decisiones aún abiertas (para resolver al implementar)

- Set exacto de `property_type_ai` que califican como "casa o apartamento"
- URL del canal de WhatsApp (la provee el usuario)
- Si timestamp usa `created_at` o `last_seen_at`
- Tile provider de Leaflet (OpenStreetMap default vs CartoDB Positron para look más editorial)
- Curaduría de los 6 listings que aparecen en sección "Recién hoy" del home — orden por `created_at` desc, pero filtrar manualmente los que tengan fotos malas para no romper el hero

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El nuevo diseño tampoco le gusta al usuario | Mostrar mockup del hero antes de avanzar a otras páginas; iteración temprana |
| Algunos listings tienen pocas o malas fotos → hero feo | Curar manualmente 1-2 listings con fotos de calidad para hero |
| Los `property_type_ai` no son los esperados → filtro vacío | Verificar valores en DB antes de implementar |
| LocalStorage de favoritos se pierde → mala experiencia | Aceptado como tradeoff de V1; posible migrar a auth en V2 si crece |
| El CTA de WhatsApp no convierte porque la página o el canal no transmiten valor | Iterar copy del CTA y del canal después de medir clicks |
| Markers del mapa con coordenadas incorrectas (algunos listings con geo malo del scraper) | Filtrar listings sin coords válidas del mapa, log de listings excluidos para review |
| GSAP + framer-motion juntos = bundle pesado | Lazy-load GSAP solo en páginas que lo usen (hero del home), framer-motion global |
| Leaflet renderea mal con SSR de Next.js | Usar dynamic import con `ssr: false` para componentes de mapa |
