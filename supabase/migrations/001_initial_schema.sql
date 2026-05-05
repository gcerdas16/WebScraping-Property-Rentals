-- ============================================================
-- CR Market Scraper — Schema inicial
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA PRINCIPAL: listings
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Fuente
  source_id             TEXT NOT NULL,
  source_url            TEXT,
  listing_url           TEXT,

  -- Tipo de transacción
  transaction_type      TEXT NOT NULL DEFAULT 'desconocido'
                          CHECK (transaction_type IN ('alquiler', 'venta', 'desconocido')),

  -- Contenido básico
  title                 TEXT,
  description           TEXT,

  -- Precios (3 capas)
  price_raw             TEXT,
  price_crc             INTEGER,
  price_usd             INTEGER,
  price_ai_crc          INTEGER,
  price_ai_usd          INTEGER,
  price_final_crc       INTEGER,
  price_final_usd       INTEGER,
  currency              TEXT CHECK (currency IN ('CRC', 'USD', NULL)),

  -- Campos scrapeados (DOM/GQL)
  bedrooms              NUMERIC(4,1),
  bathrooms             NUMERIC(4,1),
  image_url_fb          TEXT,
  image_url             TEXT,
  image_urls_fb         TEXT[] DEFAULT '{}',
  image_urls            TEXT[] DEFAULT '{}',

  -- Campos extraídos por AI
  bedrooms_ai           NUMERIC(4,1),
  bathrooms_ai          NUMERIC(4,1),
  property_type         TEXT,
  property_type_ai      TEXT,
  square_meters         NUMERIC,
  parking               INTEGER,
  floor                 INTEGER,
  furnished             TEXT CHECK (furnished IN ('amueblado', 'semi', 'sin muebles', NULL)),
  pets_allowed          BOOLEAN,
  utilities_included    TEXT[],
  amenities             TEXT[],
  deposit_crc           INTEGER,
  contact_phone         TEXT,
  condominio_name       TEXT,

  -- Ubicación
  location_city         TEXT,
  location_province     TEXT,
  location_latitude     NUMERIC,
  location_longitude    NUMERIC,
  search_city           TEXT,

  -- Calidad y estado
  quality_score         INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  is_published          BOOLEAN NOT NULL DEFAULT false,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  consecutive_misses    INTEGER NOT NULL DEFAULT 0,
  data_source           TEXT,

  -- Timestamps
  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at      TIMESTAMPTZ,
  price_changed_at      TIMESTAMPTZ,
  times_price_changed   INTEGER NOT NULL DEFAULT 0,
  inactive_detected_at  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Vendedor y estado del anuncio
  seller_name           TEXT,
  listing_status        TEXT,

  -- Condiciones de la propiedad (extraídos por AI)
  max_people            INTEGER,
  availability          TEXT,
  restrictions          TEXT[] DEFAULT '{}',

  -- Restricción: un listing de FB puede tener UN registro de alquiler y UNO de venta
  CONSTRAINT listings_source_transaction_unique UNIQUE (source_id, transaction_type)
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_listings_source_id         ON listings (source_id);
CREATE INDEX IF NOT EXISTS idx_listings_is_active         ON listings (is_active);
CREATE INDEX IF NOT EXISTS idx_listings_is_published      ON listings (is_published);
CREATE INDEX IF NOT EXISTS idx_listings_transaction_type  ON listings (transaction_type);
CREATE INDEX IF NOT EXISTS idx_listings_last_verified_at  ON listings (last_verified_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_listings_location_city     ON listings (location_city);
CREATE INDEX IF NOT EXISTS idx_listings_price_final_crc   ON listings (price_final_crc);
CREATE INDEX IF NOT EXISTS idx_listings_bedrooms          ON listings (bedrooms);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLA: price_history
-- Registra cada cambio de precio por listing
-- ============================================================
CREATE TABLE IF NOT EXISTS price_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price_crc    INTEGER,
  price_usd    INTEGER,
  price_raw    TEXT,
  change_type  TEXT NOT NULL
                 CHECK (change_type IN ('initial', 'increase', 'decrease', 'relisted')),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_listing_id ON price_history (listing_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history (recorded_at DESC);

-- ============================================================
-- TABLA: scraper_runs
-- Historial de cada corrida del scraper para monitoreo
-- ============================================================
CREATE TABLE IF NOT EXISTS scraper_runs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at           TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'running'
                          CHECK (status IN ('running', 'completed', 'failed')),
  run_type              TEXT NOT NULL DEFAULT 'daily'
                          CHECK (run_type IN ('bulk', 'daily', 'manual')),
  cities_scraped        TEXT[],
  new_listings          INTEGER DEFAULT 0,
  updated_listings      INTEGER DEFAULT 0,
  inactive_detected     INTEGER DEFAULT 0,
  price_changes         INTEGER DEFAULT 0,
  enriched_count        INTEGER DEFAULT 0,
  verified_count        INTEGER DEFAULT 0,
  errors_count          INTEGER DEFAULT 0,
  total_listings_in_db  INTEGER DEFAULT 0,
  notes                 TEXT
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_started_at ON scraper_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status      ON scraper_runs (status);

-- ============================================================
-- TABLA: saved_searches
-- Búsquedas guardadas por usuarios para recibir alertas
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_searches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  filters           JSONB NOT NULL DEFAULT '{}',
  notify_email      BOOLEAN NOT NULL DEFAULT true,
  last_notified_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ejemplo de filters JSONB:
-- {"city": "Heredia", "min_price": 200000, "max_price": 500000,
--  "bedrooms": 2, "property_type": "Apartamento", "transaction_type": "alquiler"}

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches (user_id);

CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLA: search_alerts
-- Historial de alertas enviadas (evita duplicados)
-- ============================================================
CREATE TABLE IF NOT EXISTS search_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id  UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  listing_id       UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT search_alerts_unique UNIQUE (saved_search_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_search_alerts_saved_search_id ON search_alerts (saved_search_id);
CREATE INDEX IF NOT EXISTS idx_search_alerts_listing_id      ON search_alerts (listing_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- listings: públicos para leer, solo service_role para escribir
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listings_public_read"
  ON listings FOR SELECT USING (is_published = true AND is_active = true);
CREATE POLICY "listings_service_write"
  ON listings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- price_history: solo lectura autenticada
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_history_read"
  ON price_history FOR SELECT USING (true);
CREATE POLICY "price_history_service_write"
  ON price_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- scraper_runs: solo service_role
ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scraper_runs_service_only"
  ON scraper_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- saved_searches: cada usuario ve solo las suyas
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_searches_owner"
  ON saved_searches FOR ALL USING (auth.uid() = user_id);

-- search_alerts: cada usuario ve solo las suyas
ALTER TABLE search_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_alerts_owner"
  ON search_alerts FOR SELECT
  USING (saved_search_id IN (
    SELECT id FROM saved_searches WHERE user_id = auth.uid()
  ));
CREATE POLICY "search_alerts_service_write"
  ON search_alerts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- VISTA ÚTIL: listings activos y publicados
-- ============================================================
CREATE OR REPLACE VIEW active_listings AS
  SELECT * FROM listings
  WHERE is_active = true AND is_published = true
  ORDER BY first_seen_at DESC;
