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
export async function getCitiesWithCounts(limit = 6): Promise<Array<{ city: string; count: number }>> {
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
