import { supabase } from './supabase'
import { RENTAL_PROPERTY_TYPES } from './filters'
import type { Listing } from '@/types/listing'

const RENTAL_TYPES = RENTAL_PROPERTY_TYPES as unknown as string[]

/** Total count of active casas + apartamentos for the home hero stat. */
export async function getActiveListingsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('listings')
    .select('source_id', { count: 'exact', head: true })
    .in('property_type_ai', RENTAL_TYPES)

  if (error) {
    console.error('getActiveListingsCount:', error)
    return 0
  }
  return count ?? 0
}

/** Most recent listings for the "Recién hoy" home section. */
export async function getRecentListings(limit = 6, offset = 0): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .in('property_type_ai', RENTAL_TYPES)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('getRecentListings:', error)
    return []
  }
  return (data ?? []) as Listing[]
}

/** Top cities with listing counts for the home "Por ciudad" section. */
export async function getCitiesWithCounts(
  limit = 6
): Promise<Array<{ city: string; count: number }>> {
  const { data, error } = await supabase
    .from('listings')
    .select('location_city')
    .in('property_type_ai', RENTAL_TYPES)
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

export interface ListingsFilters {
  city?: string
  type?: string
  bedrooms?: number
  priceMin?: number
  priceMax?: number
  page?: number
  pageSize?: number
}

export interface ListingsResult {
  listings: Listing[]
  total: number
}

/** Filtered + paginated listings for the /listings page. */
export async function getListings(filters: ListingsFilters = {}): Promise<ListingsResult> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.max(1, Math.min(60, filters.pageSize ?? 12))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .in('property_type_ai', RENTAL_TYPES)

  if (filters.type && RENTAL_TYPES.includes(filters.type)) {
    query = query.eq('property_type_ai', filters.type)
  }
  if (filters.city) {
    query = query.eq('location_city', filters.city)
  }
  if (filters.bedrooms != null) {
    query = query.gte('bedrooms_ai', filters.bedrooms)
  }
  if (filters.priceMin != null) {
    query = query.gte('price_final_crc', filters.priceMin)
  }
  if (filters.priceMax != null) {
    query = query.lte('price_final_crc', filters.priceMax)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('getListings:', error)
    return { listings: [], total: 0 }
  }

  return {
    listings: (data ?? []) as Listing[],
    total: count ?? 0,
  }
}

/** Single listing for detail page. */
export async function getListingBySourceId(sourceId: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('source_id', sourceId)
    .maybeSingle()

  if (error) {
    console.error('getListingBySourceId:', error)
    return null
  }
  return (data as Listing) ?? null
}

/** Similar listings: same city + same type, excluding the current one. */
export async function getSimilarListings(listing: Listing, limit = 3): Promise<Listing[]> {
  let query = supabase
    .from('listings')
    .select('*')
    .in('property_type_ai', RENTAL_TYPES)
    .neq('source_id', listing.source_id)

  if (listing.location_city) {
    query = query.eq('location_city', listing.location_city)
  }
  if (listing.property_type_ai) {
    query = query.eq('property_type_ai', listing.property_type_ai)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)

  if (error) {
    console.error('getSimilarListings:', error)
    return []
  }
  return (data ?? []) as Listing[]
}

/** All distinct cities for filter dropdown. */
export async function getAllCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('location_city')
    .in('property_type_ai', RENTAL_TYPES)
    .not('location_city', 'is', null)

  if (error) {
    console.error('getAllCities:', error)
    return []
  }
  const set = new Set<string>()
  for (const row of data ?? []) {
    const c = (row as { location_city: string | null }).location_city
    if (c) set.add(c)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
}
