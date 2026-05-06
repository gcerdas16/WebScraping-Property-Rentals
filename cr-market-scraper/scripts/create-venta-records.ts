import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EXCHANGE_RATE = 464;

const salePrices: Record<string, { usd?: number; crc?: number }> = {
  "4308756779353158":  { usd: 440000 },
  "1294762749249521":  { crc: 175000000 },
  "873364608571104":   { usd: 430000 },
  "3417736505049765":  { usd: 154000 },
  "1630267281522759":  { usd: 330000 },
  "1314085174104022":  { usd: 140000 },
  "1498268621961278":  { crc: 650000 },
  "2016798112523890":  { usd: 125000 },
  "2085839372276750":  { usd: 198000 },
  "1651891152675483":  { usd: 420000 },
  "1263974805288943":  { usd: 420000 },
  "1809124216715091":  { crc: 99000000 },
  "1688158222631971":  { usd: 265000 },
  "973455238890033":   { usd: 1200000 },
  "876738251416974":   { crc: 130000000 },
  "593311157951038":   { usd: 250000 },
};

async function main() {
  let created = 0;
  let errors = 0;

  for (const [sourceId, sp] of Object.entries(salePrices)) {
    // Traer el registro de alquiler existente
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("source_id", sourceId)
      .eq("transaction_type", "alquiler")
      .single();

    if (error || !data) {
      console.log(`  ⚠ No encontrado: ${sourceId}`);
      errors++;
      continue;
    }

    // Calcular precios finales
    const finalUSD = sp.usd ?? Math.round((sp.crc ?? 0) / EXCHANGE_RATE);
    const finalCRC = sp.crc ?? (sp.usd ?? 0) * EXCHANGE_RATE;
    const currency = sp.usd ? "USD" : "CRC";

    // Construir row de venta — copiar todo, reemplazar id/transaction_type/precios
    const { id: _id, created_at: _ca, updated_at: _ua, first_seen_at: _fsa,
            last_seen_at: _lsa, last_verified_at: _lva, price_changed_at: _pca,
            inactive_detected_at: _ida, ...rest } = data;

    const ventaRow = {
      ...rest,
      transaction_type: "venta",
      price_crc:         null,
      price_usd:         null,
      price_ai_crc:      null,
      price_ai_usd:      null,
      price_final_crc:   finalCRC,
      price_final_usd:   finalUSD,
      currency,
    };

    const { error: insertError } = await supabase.from("listings").insert(ventaRow);

    if (insertError) {
      console.log(`  ✗ Error [${sourceId}]: ${insertError.message}`);
      errors++;
    } else {
      const priceStr = sp.usd ? `$${sp.usd.toLocaleString()}` : `₡${sp.crc!.toLocaleString()}`;
      console.log(`  ✓ Creado venta [${sourceId}] → ${priceStr}`);
      created++;
    }
  }

  console.log(`\nCreados: ${created}  |  Errores: ${errors}`);

  const { count } = await supabase.from("listings").select("*", { count: "exact", head: true });
  console.log(`Total DB: ${count}`);
}

main().catch(console.error);
