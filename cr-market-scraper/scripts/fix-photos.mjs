/**
 * fix-photos.mjs
 * Limpia los arrays image_urls_fb y image_urls dejando solo
 * las fotos reales del listing (formato t45.5328 de Facebook Marketplace).
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf-8");
env.split("\n").forEach(l => { const [k,...v]=l.split("="); if(k&&v.length) process.env[k.trim()]=v.join("=").trim(); });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: listings } = await sb.from("listings").select("id, source_id, image_urls_fb, image_urls");
console.log(`Total listings: ${listings.length}`);

let updated = 0;
let noChange = 0;

for (const l of listings) {
  const fbUrls    = l.image_urls_fb ?? [];
  const cloudUrls = l.image_urls    ?? [];

  // Keep only positions where the FB URL is a real listing photo (t45.5328)
  const keepIndices = fbUrls
    .map((url, i) => ({ url, i }))
    .filter(({ url }) => url.includes("t45.5328"))
    .map(({ i }) => i);

  if (keepIndices.length === fbUrls.length) { noChange++; continue; } // already clean

  const cleanFb    = keepIndices.map(i => fbUrls[i]);
  const cleanCloud = keepIndices.map(i => cloudUrls[i] ?? null).filter(Boolean);

  await sb.from("listings").update({
    image_urls_fb: cleanFb,
    image_urls:    cleanCloud,
    image_url_fb:  cleanFb[0]    ?? null,
    image_url:     cleanCloud[0] ?? null,
  }).eq("id", l.id);

  updated++;
}

console.log(`\n✅ Limpieza completa:`);
console.log(`   Actualizados: ${updated}`);
console.log(`   Sin cambio:   ${noChange}`);

// Show new distribution
const { data: after } = await sb.from("listings").select("image_urls_fb");
const dist = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, "6+":0 };
for (const l of after) {
  const n = l.image_urls_fb?.length ?? 0;
  if (n <= 5) dist[n]++;
  else dist["6+"]++;
}
console.log(`\nDistribución post-limpieza:`);
for (const [k,v] of Object.entries(dist)) {
  if (v > 0) console.log(`  ${k} fotos: ${v} listings`);
}
