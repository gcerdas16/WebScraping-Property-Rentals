import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const EXCHANGE_RATE = 464;
const BATCH_SIZE = 10;

// ── Mismo prompt nuevo del scraper ───────────────────────────

const systemPrompt = `Sos un experto en análisis de anuncios inmobiliarios de Costa Rica.
Tu tarea es extraer datos estructurados de anuncios del Marketplace de Facebook.

REGLAS CRÍTICAS SOBRE PRECIOS:
1. Muchos anuncios ofrecen TANTO alquiler como venta — tienen precios DISTINTOS para cada modalidad.
2. rentPriceCRC / rentPriceUSD = precio MENSUAL de alquiler solamente.
3. salePriceCRC / salePriceUSD = precio de venta (pago único) solamente.
4. NUNCA pongas el precio de venta en rent, ni el precio de alquiler en sale.
5. Señales de precio de alquiler: "alquiler $X", "se alquila en $X", "x mes", "mensual", "por mes", "renta $X".
6. Señales de precio de venta: "venta $X", "precio $X", "valor $X", "se vende en $X".
7. Si el anuncio solo menciona alquiler → rentPrice = ese precio, salePriceCRC/USD = null.
8. Si el anuncio menciona ambos → separalos correctamente en sus campos respectivos.
9. Precios en colones: ₡, CRC, "colones". Precios en USD: $, USD, "dólares".
10. Notación española: $1.200 = $1,200 (punto = separador de miles, NO decimal).`;

async function aiExtractBatch(items: Array<{ id: string; title: string; description: string }>) {
  const userPrompt = `Analizá estos ${items.length} anuncios de propiedades en Costa Rica.
Para CADA uno retorná un JSON con:
- id (exacto), transactionType ("alquiler"|"venta"|"ambos"|"desconocido"),
  rentPriceCRC, rentPriceUSD, salePriceCRC, salePriceUSD (números enteros o null),
  bedroomsAI, bathroomsAI (números o null),
  contactPhone (string|null)

Retorná SOLO un JSON array, sin markdown.

ANUNCIOS:
${items.map((l, i) => `[${i + 1}] ID: ${l.id}\nTítulo: ${l.title}\nDesc: ${l.description.slice(0, 3000)}`).join("\n\n---\n\n")}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json() as { content: { text: string }[] };
  const text = data.content[0]?.text ?? "[]";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return {};
  const results = JSON.parse(match[0]) as Array<Record<string, unknown>>;
  return Object.fromEntries(results.map(r => [r.id as string, r]));
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const { data, error } = await supabase
    .from("listings")
    .select("source_id, title, description, price_final_crc, price_final_usd, currency, bedrooms_ai, bathrooms_ai, contact_phone, transaction_type")
    .not("description", "is", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Source IDs que ya tienen registro de venta — para evitar falsos positivos
  const { data: ventaRows } = await supabase
    .from("listings")
    .select("source_id")
    .eq("transaction_type", "venta");
  const ventaSourceIds = new Set((ventaRows ?? []).map(r => r.source_id));

  const valid = data.filter(r => r.description && r.description.length > 20);
  console.log(`\nAnalizando ${valid.length} registros con descripción...\n`);

  const issues: Array<{
    source_id: string;
    tipo: string;
    detalle: string;
    actual: string;
    ai_sugiere: string;
  }> = [];

  // Procesar en batches
  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(valid.length / BATCH_SIZE);
    process.stdout.write(`  Batch ${batchNum}/${totalBatches}...\r`);

    const aiInputs = batch.map(r => ({
      id: r.source_id,
      title: r.title ?? "",
      description: r.description ?? "",
    }));

    let aiResults: Record<string, Record<string, unknown>> = {};
    try {
      aiResults = await aiExtractBatch(aiInputs);
    } catch (e) {
      console.error(`  Error batch ${batchNum}: ${e}`);
      continue;
    }

    for (const r of batch) {
      const ai = aiResults[r.source_id];
      if (!ai) continue;

      // ── Precio final CRC ──
      const aiRentCRC  = ai.rentPriceCRC  as number | null;
      const aiRentUSD  = ai.rentPriceUSD  as number | null;
      const aiSaleCRC  = ai.salePriceCRC  as number | null;
      const aiSaleUSD  = ai.salePriceUSD  as number | null;

      // Calcular el precio que AI daría como final_crc para alquiler
      let aiFinalCRC: number | null = null;
      let aiFinalUSD: number | null = null;
      if (aiRentCRC) { aiFinalCRC = aiRentCRC; aiFinalUSD = Math.round(aiRentCRC / EXCHANGE_RATE); }
      else if (aiRentUSD) { aiFinalUSD = aiRentUSD; aiFinalCRC = aiRentUSD * EXCHANGE_RATE; }

      if (aiFinalCRC && r.price_final_crc) {
        const ratio = aiFinalCRC / r.price_final_crc;
        if (ratio < 0.7 || ratio > 1.4) {
          issues.push({
            source_id: r.source_id,
            tipo: "PRECIO_DIFERENTE",
            detalle: `AI detecta precio distinto al guardado`,
            actual: `₡${r.price_final_crc?.toLocaleString()} / $${r.price_final_usd?.toLocaleString()}`,
            ai_sugiere: `₡${aiFinalCRC?.toLocaleString()} / $${aiFinalUSD?.toLocaleString()}`,
          });
        }
      }

      // ── Tiene precio de venta que no está registrado ──
      if ((aiSaleCRC || aiSaleUSD) && r.transaction_type === "alquiler" && !ventaSourceIds.has(r.source_id)) {
        issues.push({
          source_id: r.source_id,
          tipo: "VENTA_NO_REGISTRADA",
          detalle: `AI detecta precio de venta en descripción pero no hay registro de venta`,
          actual: `solo alquiler`,
          ai_sugiere: aiSaleCRC ? `venta ₡${(aiSaleCRC as number).toLocaleString()}` : `venta $${(aiSaleUSD as number).toLocaleString()}`,
        });
      }

      // ── Habitaciones ──
      const aiRooms = ai.bedroomsAI as number | null;
      if (aiRooms !== null && r.bedrooms_ai !== null && Math.abs(aiRooms - r.bedrooms_ai) >= 1) {
        issues.push({
          source_id: r.source_id,
          tipo: "HABITACIONES_DIFF",
          detalle: `AI sugiere diferente número de habitaciones`,
          actual: String(r.bedrooms_ai),
          ai_sugiere: String(aiRooms),
        });
      }

      // ── Teléfono ──
      const aiPhone = ai.contactPhone as string | null;
      if (aiPhone && !r.contact_phone) {
        issues.push({
          source_id: r.source_id,
          tipo: "TELEFONO_FALTANTE",
          detalle: `AI detecta teléfono en descripción que no está guardado`,
          actual: "NULL",
          ai_sugiere: aiPhone,
        });
      }
    }

    // Pequeña pausa entre batches para no saturar la API
    await new Promise(r => setTimeout(r, 500));
  }

  // ── Resumen ───────────────────────────────────────────────
  console.log(`\n\n=== RESUMEN (${issues.length} issues en ${valid.length} registros) ===\n`);

  const tipos = [...new Set(issues.map(i => i.tipo))];
  for (const tipo of tipos) {
    const grupo = issues.filter(i => i.tipo === tipo);
    console.log(`  ${tipo.padEnd(25)} ${grupo.length} registros`);
  }

  // ── Detalle por tipo ──────────────────────────────────────
  for (const tipo of tipos) {
    const grupo = issues.filter(i => i.tipo === tipo);
    console.log(`\n--- ${tipo} (${grupo.length}) ---`);
    for (const issue of grupo.slice(0, 30)) {
      console.log(`  [${issue.source_id}]`);
      console.log(`    Actual:     ${issue.actual}`);
      console.log(`    AI sugiere: ${issue.ai_sugiere}`);
    }
    if (grupo.length > 30) console.log(`  ... y ${grupo.length - 30} más`);
  }
}

main().catch(console.error);
