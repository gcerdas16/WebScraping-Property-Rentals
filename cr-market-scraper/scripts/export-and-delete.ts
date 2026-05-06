/**
 * export-and-delete.ts
 * Exporta los listings indicados a CSV y luego los borra de la DB.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SOURCE_IDS = [
  "1022465723648540",
  "848954654914243",
  "1297683355032140",
  "1805659843976400",
  "3851533061819493",
  "1472297167095114",
  "1732079644870226",
  "897717489991068",
  "1970941457144113",
  "2034899020439240",
];

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : Array.isArray(v) ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = keys.join(",");
  const lines  = rows.map(r => keys.map(k => escape(r[k])).join(","));
  return [header, ...lines].join("\n");
}

async function main() {
  // 1. Fetch
  const { data: rows, error } = await supabase
    .from("listings")
    .select("*")
    .in("source_id", SOURCE_IDS);

  if (error) { console.error("❌ Error al consultar:", error.message); process.exit(1); }
  if (!rows?.length) { console.log("⚠ No se encontró ninguno de esos source_ids en la DB."); process.exit(0); }

  console.log(`✓ ${rows.length} listings encontrados en DB`);
  rows.forEach(r => {
    console.log(`  ${r.source_id} | ${r.title ?? "(sin título)"} | ${r.price_raw ?? "(sin precio)"} | lat=${r.location_latitude ?? "n/a"} lng=${r.location_longitude ?? "n/a"}`);
  });

  // 2. Export CSV
  const csvPath = path.resolve(`listings-export-${Date.now()}.csv`);
  fs.writeFileSync(csvPath, toCsv(rows as Record<string, unknown>[]));
  console.log(`\n✓ CSV exportado → ${csvPath}`);

  // 3. Delete
  const { error: delErr, count } = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .in("source_id", SOURCE_IDS);

  if (delErr) { console.error("❌ Error al borrar:", delErr.message); process.exit(1); }
  console.log(`✓ ${count ?? "?"} listings borrados de la DB`);
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
