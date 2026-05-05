/**
 * ai-extract.ts
 * Extrae campos estructurados de las descripciones usando Claude.
 * Fuente de verdad para precio, tipo de propiedad y detalles.
 *
 * Uso: npx tsx scripts/ai-extract.ts
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// ── Config ────────────────────────────────────────────────────
const SUPABASE_URL            = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY       = process.env.ANTRHOPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
const EXCHANGE_RATE_USDCRC    = 510; // CRC por USD (actualizar si cambia)
const BATCH_SIZE              = 5;   // listings por llamada a Claude
const DELAY_MS                = 1500; // pausa entre batches

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ANTHROPIC_API_KEY) {
  console.error("❌ Faltan variables de entorno (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Interfaces ────────────────────────────────────────────────
interface AIResult {
  id: string;
  transactionType: "alquiler" | "venta" | "ambos" | "desconocido";
  rentPriceCRC:    number | null;
  rentPriceUSD:    number | null;
  salePriceCRC:    number | null;
  salePriceUSD:    number | null;
  bedroomsAI:      number | null;
  bathroomsAI:     number | null;
  propertyTypeAI:  string | null;
  squareMeters:    number | null;
  parking:         number | null;
  floor:           number | null;
  furnished:       "amueblado" | "semi" | "sin muebles" | null;
  petsAllowed:     boolean | null;
  utilitiesIncluded: string[];
  amenities:       string[];
  depositCRC:      number | null;
  contactPhone:    string | null;
  condominioName:  string | null;
}

// ── Prompt de extracción ─────────────────────────────────────
function buildPrompt(listings: { id: string; description: string; title: string }[]): string {
  const items = listings.map((l, i) =>
    `[${i + 1}] ID: ${l.id}\nTítulo: ${l.title ?? ""}\nDescripción: ${(l.description ?? "").slice(0, 1500)}`
  ).join("\n\n---\n\n");

  return `Analizá estos ${listings.length} anuncios de propiedades de Facebook Marketplace Costa Rica.

Para CADA anuncio retorná un objeto JSON con los siguientes campos:
- id: el ID exacto del anuncio
- transactionType: "alquiler" | "venta" | "ambos" | "desconocido"
- rentPriceCRC: precio mensual de alquiler en colones (número entero) o null
- rentPriceUSD: precio mensual de alquiler en dólares (número entero) o null
- salePriceCRC: precio de venta en colones (número entero) o null
- salePriceUSD: precio de venta en dólares (número entero) o null
- bedroomsAI: número de habitaciones (puede ser decimal como 2.5) o null
- bathroomsAI: número de baños (puede ser decimal como 1.5) o null
- propertyTypeAI: "Apartamento" | "Casa" | "Oficina" | "Local" | "Bodega" | "Habitación" | "Terreno" | "Otro"
- squareMeters: metros cuadrados como número o null
- parking: número de parqueos o null
- floor: número de piso o null
- furnished: "amueblado" | "semi" | "sin muebles" | null
- petsAllowed: true | false | null
- utilitiesIncluded: array de strings incluidos (ej: ["agua", "luz", "internet", "cable", "condominio"])
- amenities: array de amenidades (ej: ["piscina", "gimnasio", "seguridad 24/7", "área BBQ"])
- depositCRC: depósito en colones (número entero) o null
- contactPhone: número de teléfono del vendedor o null
- condominioName: nombre del condominio si se menciona o null

REGLAS IMPORTANTES:
- Si el anuncio dice tanto alquiler COMO venta, transactionType = "ambos" y extraé ambos precios
- Si el precio parece USD pero está marcado como CRC (ej: "CRC1500" para una renta mensual que claramente son dólares), corregilo y ponelo en rentPriceUSD
- Los precios en colones suelen tener 6+ dígitos (ej: ₡460,000). Los de 4 dígitos suelen ser USD
- Retorná SOLO un array JSON válido, sin texto adicional, sin markdown

ANUNCIOS:

${items}`;
}

// ── Llamada a Claude ──────────────────────────────────────────
async function callClaude(prompt: string): Promise<AIResult[]> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json() as { content: { text: string }[] };
  const text = data.content[0]?.text ?? "[]";

  // Extraer JSON del response (puede venir con markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error(`Claude no retornó JSON válido: ${text.slice(0, 200)}`);

  return JSON.parse(jsonMatch[0]) as AIResult[];
}

// ── Upsert de un listing con datos de AI ─────────────────────
async function updateListingWithAI(result: AIResult, existingListing: Record<string, unknown>): Promise<void> {
  // Determinar precio final (AI tiene prioridad sobre el card)
  const rentCRC  = result.rentPriceCRC  ?? null;
  const rentUSD  = result.rentPriceUSD  ?? null;
  const finalCRC = rentCRC ?? (rentUSD ? Math.round(rentUSD * EXCHANGE_RATE_USDCRC) : (existingListing.price_crc as number | null));
  const finalUSD = rentUSD ?? (rentCRC ? Math.round(rentCRC / EXCHANGE_RATE_USDCRC) : (existingListing.price_usd as number | null));

  const transType = result.transactionType === "ambos" ? "alquiler" : result.transactionType;

  // Recalcular quality_score con los datos de AI
  let score = 0;
  if (finalCRC && finalCRC > 0)             score++;
  if (existingListing.description && (existingListing.description as string).length > 20) score++;
  if (existingListing.location_city)        score++;
  if (existingListing.image_url_fb)         score++;
  if (result.bedroomsAI != null || existingListing.bedrooms != null) score++;
  score = Math.max(score, 1);

  const update = {
    transaction_type:    transType,
    price_ai_crc:        rentCRC,
    price_ai_usd:        rentUSD,
    price_final_crc:     finalCRC,
    price_final_usd:     finalUSD,
    bedrooms_ai:         result.bedroomsAI,
    bathrooms_ai:        result.bathroomsAI,
    property_type_ai:    result.propertyTypeAI,
    property_type:       result.propertyTypeAI ?? existingListing.property_type,
    square_meters:       result.squareMeters,
    parking:             result.parking,
    floor:               result.floor,
    furnished:           result.furnished,
    pets_allowed:        result.petsAllowed,
    utilities_included:  result.utilitiesIncluded ?? [],
    amenities:           result.amenities ?? [],
    deposit_crc:         result.depositCRC,
    contact_phone:       result.contactPhone,
    condominio_name:     result.condominioName,
    quality_score:       score,
    is_published:        score >= 3,
  };

  const { error } = await supabase
    .from("listings")
    .update(update)
    .eq("id", existingListing.id as string);

  if (error) throw new Error(`Update error for ${existingListing.id}: ${error.message}`);

  // Si es "ambos" (alquiler + venta), crear registro de venta separado
  if (result.transactionType === "ambos" && (result.salePriceCRC || result.salePriceUSD)) {
    const saleCRC = result.salePriceCRC ?? (result.salePriceUSD ? Math.round(result.salePriceUSD * EXCHANGE_RATE_USDCRC) : null);
    const saleUSD = result.salePriceUSD ?? (result.salePriceCRC ? Math.round(result.salePriceCRC / EXCHANGE_RATE_USDCRC) : null);

    const ventaRow = {
      ...existingListing,
      id:               undefined,  // nuevo UUID
      transaction_type: "venta",
      price_final_crc:  saleCRC,
      price_final_usd:  saleUSD,
      price_ai_crc:     result.salePriceCRC,
      price_ai_usd:     result.salePriceUSD,
      property_type:    result.propertyTypeAI ?? existingListing.property_type,
      property_type_ai: result.propertyTypeAI,
      quality_score:    score,
      is_published:     score >= 3,
    };
    delete (ventaRow as Record<string, unknown>)["id"];

    const { error: ventaErr } = await supabase
      .from("listings")
      .upsert(ventaRow, { onConflict: "source_id,transaction_type", ignoreDuplicates: true });

    if (ventaErr) console.warn(`  ⚠ Venta record error: ${ventaErr.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log("\n=== AI Extraction — CR Market ===\n");

  // Leer listings sin AI extraction (price_ai_crc IS NULL y description no es null)
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, source_id, title, description, price_crc, price_usd, location_city, image_url_fb, bedrooms, property_type")
    .is("price_ai_crc", null)
    .not("description", "is", null)
    .order("created_at", { ascending: true });

  if (error) { console.error("❌ Error leyendo listings:", error.message); process.exit(1); }
  if (!listings?.length) { console.log("✅ No hay listings pendientes de AI extraction."); return; }

  console.log(`Listings a procesar: ${listings.length}`);
  console.log(`Batches de ${BATCH_SIZE} → ${Math.ceil(listings.length / BATCH_SIZE)} llamadas a Claude Haiku\n`);

  let processed = 0;
  let errors = 0;
  let ambosCount = 0;

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);

    try {
      const prompt = buildPrompt(batch.map(l => ({
        id: l.id,
        title: l.title ?? "",
        description: l.description ?? "",
      })));

      const results = await callClaude(prompt);

      for (const result of results) {
        const listing = batch.find(l => l.id === result.id);
        if (!listing) continue;

        await updateListingWithAI(result, listing as Record<string, unknown>);

        if (result.transactionType === "ambos") ambosCount++;
        processed++;
      }

      process.stdout.write(`\r  ✓ ${processed}/${listings.length} procesados...`);

      if (i + BATCH_SIZE < listings.length) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    } catch (err) {
      errors++;
      console.error(`\n  ❌ Batch ${i}-${i + BATCH_SIZE}: ${(err as Error).message}`);
    }
  }

  console.log(`\n\n✅ AI Extraction completa:`);
  console.log(`   Procesados:         ${processed}`);
  console.log(`   Errores:            ${errors}`);
  console.log(`   Listings "ambos":   ${ambosCount} → creados ${ambosCount} registros de venta adicionales`);
}

main();
