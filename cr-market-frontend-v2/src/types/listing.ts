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
