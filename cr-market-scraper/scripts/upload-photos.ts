/**
 * upload-photos.ts
 * Descarga TODAS las fotos de un listing de Facebook y las sube a Cloudinary.
 * Cada foto se guarda como listing-{sourceId}-{index} (0 = principal).
 * Limpia URLs de Facebook (tokens de expiración) por URLs permanentes.
 *
 * Uso: npx tsx scripts/upload-photos.ts
 */
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// ── Config ────────────────────────────────────────────────────
const SUPABASE_URL         = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CLOUD_NAME           = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY              = process.env.CLOUDINARY_API_KEY!;
const API_SECRET           = process.env.CLOUDINARY_API_SECRET!;
const CONCURRENT           = 5;   // listings en paralelo
const DELAY_MS             = 200;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error("❌ Faltan variables de entorno de Supabase o Cloudinary");
  process.exit(1);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ───────────────────────────────────────────────────
function cleanFbUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Mantener pathname limpio, sin query params con tokens
    return `https://${u.hostname}${u.pathname}`;
  } catch {
    return raw;
  }
}

function isFbCdnUrl(url: string): boolean {
  return url.includes("fbcdn.net") || url.includes("scontent");
}

async function uploadOnePhoto(fbUrl: string, publicId: string): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(fbUrl, {
      folder:         "cr-market",
      public_id:      publicId,
      overwrite:      false,
      resource_type:  "image",
      fetch_format:   "auto",
      quality:        "auto:good",
      transformation: [{ width: 1200, crop: "limit" }],
    });
    return result.secure_url;
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("already exists")) {
      return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/cr-market/${publicId}`;
    }
    // Foto expirada / inaccesible — retornar null (no es error fatal)
    if (msg.includes("400") || msg.includes("403") || msg.includes("404") || msg.includes("fetch")) {
      return null;
    }
    throw err;
  }
}

async function processListing(listing: {
  id: string;
  source_id: string;
  image_urls_fb: string[];
  image_urls: string[];
}): Promise<{ uploaded: number; expired: number }> {
  const rawUrls = listing.image_urls_fb ?? [];
  if (rawUrls.length === 0) return { uploaded: 0, expired: 0 };

  const cloudUrls: string[] = [...(listing.image_urls ?? [])];
  const cleanFbUrls: string[] = [];
  let uploaded = 0;
  let expired  = 0;

  for (let idx = 0; idx < rawUrls.length; idx++) {
    const fbUrl = rawUrls[idx];
    cleanFbUrls.push(cleanFbUrl(fbUrl));

    // Solo subir si es URL de CDN de FB y no tenemos ya esa posición en Cloudinary
    if (isFbCdnUrl(fbUrl) && !cloudUrls[idx]) {
      const publicId = `listing-${listing.source_id}-${idx}`;
      const cloudUrl = await uploadOnePhoto(fbUrl, publicId);
      if (cloudUrl) {
        cloudUrls[idx] = cloudUrl;
        uploaded++;
      } else {
        expired++;
      }
    }
  }

  // Actualizar DB: URLs de Cloudinary + URLs de FB limpias
  await supabase.from("listings").update({
    image_urls:    cloudUrls,
    image_urls_fb: cleanFbUrls,
    image_url:     cloudUrls[0] ?? listing.image_urls?.[0] ?? null,   // foto principal
    image_url_fb:  cleanFbUrls[0] ?? null,
  }).eq("id", listing.id);

  return { uploaded, expired };
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log("\n=== Upload Multi-Fotos a Cloudinary ===\n");

  // Leer listings que tienen URLs de FB sin subir a Cloudinary todavía
  // (image_urls_fb tiene URLs de fbcdn.net y image_urls no está completo)
  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, source_id, image_urls_fb, image_urls")
    .not("image_urls_fb", "is", null)
    .order("created_at", { ascending: true });

  if (error) { console.error("❌ Error:", error.message); process.exit(1); }
  if (!listings?.length) { console.log("✅ No hay fotos pendientes."); return; }

  // Filtrar solo los que tienen al menos una URL de CDN pendiente
  const pending = listings.filter(l => {
    const fbUrls  = l.image_urls_fb ?? [];
    const cdnUrls = l.image_urls ?? [];
    return fbUrls.some((u: string, i: number) => isFbCdnUrl(u) && !cdnUrls[i]);
  });

  if (!pending.length) { console.log("✅ Todas las fotos ya están en Cloudinary."); return; }

  const totalPhotos = pending.reduce((acc, l) => acc + (l.image_urls_fb?.length ?? 0), 0);
  console.log(`Listings con fotos pendientes: ${pending.length}`);
  console.log(`Total de fotos a procesar: ~${totalPhotos}\n`);

  let totalUploaded = 0;
  let totalExpired  = 0;
  let totalErrors   = 0;
  let done          = 0;

  for (let i = 0; i < pending.length; i += CONCURRENT) {
    const batch = pending.slice(i, i + CONCURRENT);

    const results = await Promise.allSettled(batch.map(l => processListing(l as {
      id: string; source_id: string; image_urls_fb: string[]; image_urls: string[];
    })));

    for (const r of results) {
      if (r.status === "fulfilled") {
        totalUploaded += r.value.uploaded;
        totalExpired  += r.value.expired;
      } else {
        totalErrors++;
        console.error(`\n  ❌ ${(r.reason as Error).message?.slice(0, 80)}`);
      }
      done++;
    }

    process.stdout.write(
      `\r  ✓ ${totalUploaded} subidas, ${totalExpired} expiradas, ${totalErrors} errores | ${done}/${pending.length} listings`
    );

    if (i + CONCURRENT < pending.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n\n✅ Upload completo:`);
  console.log(`   Fotos subidas a Cloudinary: ${totalUploaded}`);
  console.log(`   Fotos expiradas (FB):       ${totalExpired}`);
  console.log(`   Errores:                    ${totalErrors}`);
  console.log(`\nURL base: https://res.cloudinary.com/${CLOUD_NAME}/image/upload/cr-market/`);
}

main();
