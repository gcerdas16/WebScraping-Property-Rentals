import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await sb.from("listings").select("*").order("created_at", { ascending: false });

const cols = [
  "id","source_id","transaction_type","title","price_raw","price_final_crc","price_final_usd",
  "currency","bedrooms_ai","bathrooms_ai","property_type_ai","square_meters","parking","floor",
  "furnished","pets_allowed","max_people","availability","restrictions","utilities_included",
  "amenities","condominio_name","contact_phone","deposit_crc","location_city","location_province",
  "quality_score","is_published","is_active","seller_name","listing_status",
  "description","description_clean","image_url","created_at"
];

const esc = v => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return `"${v.join("; ").replace(/"/g, '""')}"`;
  const s = String(v);
  return (s.includes(",") || s.includes('"') || s.includes("\n"))
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

const lines = [cols.join(",")];
for (const r of data) lines.push(cols.map(c => esc(r[c])).join(","));

fs.writeFileSync("listings-export.csv", lines.join("\n"), "utf-8");
console.log(`Exportado: listings-export.csv - ${data.length} registros`);
