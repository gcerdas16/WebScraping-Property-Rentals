// property_type_ai values that qualify as "casa o apartamento" for V1.
// Verified in DB on 2026-05-06: Apartamento (295) + Casa (137) = 432 listings.
// Excluded: Habitación, Local, Oficina, Terreno, Bodega, Otro, null.
export const RENTAL_PROPERTY_TYPES = ['Casa', 'Apartamento'] as const

export type RentalPropertyType = (typeof RENTAL_PROPERTY_TYPES)[number]
