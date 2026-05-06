export type Listing = {
  id:                  string;
  source_id:           string;
  listing_url:         string | null;
  transaction_type:    "alquiler" | "venta";
  title:               string | null;
  description:         string | null;
  price_raw:           string | null;
  price_final_crc:     number | null;
  price_final_usd:     number | null;
  currency:            "CRC" | "USD" | null;
  image_urls:          string[];
  bedrooms_ai:         number | null;
  bathrooms_ai:        number | null;
  property_type_ai:    string | null;
  square_meters:       number | null;
  parking:             number | null;
  furnished:           "amueblado" | "semi" | "sin muebles" | null;
  pets_allowed:        boolean | null;
  deposit_crc:         number | null;
  contact_phone:       string | null;
  condominio_name:     string | null;
  location_city:       string | null;
  location_province:   string | null;
  location_latitude:   number | null;
  location_longitude:  number | null;
  quality_score:       number | null;
  seller_name:         string | null;
  listing_status:      string | null;
  is_active:           boolean;
  is_published:        boolean;
  last_seen_at:        string;
  created_at:          string;
};

export const EXCHANGE_RATE = 464;

export function formatPrice(listing: Listing): string {
  const crc = listing.price_final_crc;
  const usd = listing.price_final_usd;
  if (!crc && !usd) return "Precio a consultar";
  if (listing.currency === "USD" && usd) {
    return `$${usd.toLocaleString("en-US")}`;
  }
  if (crc) {
    return `₡${crc.toLocaleString("es-CR")}`;
  }
  return "Precio a consultar";
}

export function formatPriceBoth(listing: Listing): { primary: string; secondary: string | null } {
  const crc = listing.price_final_crc ?? null;
  const usd = listing.price_final_usd ?? null;
  if (crc == null && usd == null) return { primary: "Precio a consultar", secondary: null };

  if (listing.currency === "USD" && usd != null) {
    return {
      primary:   `$${usd.toLocaleString("en-US")}`,
      secondary: crc != null ? `₡${crc.toLocaleString("es-CR")}` : null,
    };
  }
  if (crc != null) {
    return {
      primary:   `₡${crc.toLocaleString("es-CR")}`,
      secondary: usd != null ? `$${usd.toLocaleString("en-US")}` : null,
    };
  }
  return { primary: `$${usd!.toLocaleString("en-US")}`, secondary: null };
}
