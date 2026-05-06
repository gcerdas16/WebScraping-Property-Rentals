/**
 * test-gql.ts
 * Prueba el enfoque de enrichment directo via GQL de Facebook.
 * Lee 10 listings de la DB (solo lectura), llama al endpoint GQL
 * por cada uno, e imprime lo que podría extraerse.
 *
 * NO escribe nada en la base de datos.
 *
 * Uso: npx tsx scripts/test-gql.ts
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "patchright-core";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// ── Config ─────────────────────────────────────────────────────
const SUPABASE_URL         = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SESSION_FILE            = path.resolve("fb-session.json");
const PLAYWRIGHT_SESSION_FILE = path.resolve("fb-playwright-session.json");

// GQL doc_ids (capturados de fb-cli, 2026-04-23)
const DOC_ID_PDP    = "35404930299120454";  // MarketplacePDPContainerQuery
const DOC_ID_PHOTOS = "10059604367394414";  // MarketplacePDPC2CMediaViewerWithImagesQuery
const GQL_URL       = "https://www.facebook.com/api/graphql/";
const UA            = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:137.0) Gecko/20100101 Firefox/137.0";

// ── Cookie loading ──────────────────────────────────────────────
interface CookieEditorEntry {
  name: string; value: string; domain: string; path: string;
  expirationDate?: number; expires?: number;
}
interface PlaywrightStorageState {
  cookies: Array<{ name: string; value: string; domain: string }>;
}

function loadCookies(): Record<string, string> {
  let entries: Array<{ name: string; value: string }> = [];

  if (fs.existsSync(PLAYWRIGHT_SESSION_FILE)) {
    const data = JSON.parse(fs.readFileSync(PLAYWRIGHT_SESSION_FILE, "utf-8")) as PlaywrightStorageState;
    entries = data.cookies.filter(c => c.domain.includes("facebook"));
    console.log(`✓ Sesión cargada desde fb-playwright-session.json (${entries.length} cookies)`);
  } else if (fs.existsSync(SESSION_FILE)) {
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
    const arr: CookieEditorEntry[] = Array.isArray(raw) ? raw : (raw as PlaywrightStorageState).cookies;
    entries = arr.filter(c => c.domain.includes("facebook"));
    console.log(`✓ Sesión cargada desde fb-session.json (${entries.length} cookies)`);
  } else {
    throw new Error("No se encontró sesión. Necesita fb-session.json o fb-playwright-session.json en la raíz del proyecto.");
  }

  return Object.fromEntries(entries.map(c => [c.name, c.value]));
}

function toCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

// ── Extraer tokens via Playwright (única forma confiable) ───────
async function fetchTokensViaPlaywright(storageState: PlaywrightStorageState) {
  console.log("  Abriendo browser para extraer tokens (solo 1 vez)...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState });
  const page    = await context.newPage();

  // Capturar tokens del body de los requests GQL que hace la página al cargar
  let captured: { fb_dtsg?: string; lsd?: string; rev?: string; userId?: string } = {};
  await context.route("**/api/graphql/", async (route) => {
    if (!captured.fb_dtsg) {
      const body   = route.request().postData() ?? "";
      const params = new URLSearchParams(body);
      const dtsg   = params.get("fb_dtsg");
      const lsd    = params.get("lsd");
      if (dtsg && lsd) {
        captured = {
          fb_dtsg: dtsg,
          lsd,
          rev:    params.get("__rev") ?? "1037953373",
          userId: params.get("av") ?? params.get("__user") ?? "0",
        };
      }
    }
    await route.continue();
  });

  await page.goto("https://www.facebook.com/marketplace/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(3_000); // esperar a que JS dispare requests GQL

  const pageUrl   = page.url();
  const pageTitle = await page.title();
  console.log(`  URL actual: ${pageUrl}`);
  console.log(`  Título:     ${pageTitle}`);

  if (!captured.fb_dtsg || !captured.lsd) {
    throw new Error("No se pudo capturar fb_dtsg/lsd de los requests GQL — verificar sesión");
  }

  // Capturar cookies actualizadas del browser
  const browseCookies = await context.cookies(["https://www.facebook.com"]);
  const cookieStr = browseCookies.map(c => `${c.name}=${c.value}`).join("; ");

  await browser.close();

  console.log(`  fb_dtsg : ${captured.fb_dtsg.slice(0, 10)}...`);
  console.log(`  lsd     : ${captured.lsd}`);
  console.log(`  rev     : ${captured.rev}`);
  console.log(`  userId  : ${captured.userId}`);

  return {
    fb_dtsg: captured.fb_dtsg,
    lsd:     captured.lsd,
    rev:     captured.rev ?? "1037953373",
    userId:  captured.userId ?? "0",
    cookieStr,
  };
}

function computeJazoest(fb_dtsg: string): string {
  const sum = fb_dtsg.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return "2" + String(sum);
}

// ── Llamada al endpoint GQL ─────────────────────────────────────
async function gqlCall(
  docId: string,
  friendlyName: string,
  variables: Record<string, unknown>,
  tokens: { fb_dtsg: string; lsd: string; rev: string; userId: string },
  cookieStr: string,
  sourceId: string,
): Promise<unknown[]> {
  const body = new URLSearchParams({
    av:                       tokens.userId,
    __user:                   tokens.userId,
    __a:                      "1",
    __req:                    "1",
    __ccg:                    "GOOD",
    __rev:                    tokens.rev,
    __comet_req:              "15",
    __crn:                    "comet.fbweb.CometMarketplaceSearchRoute",
    lsd:                      tokens.lsd,
    jazoest:                  computeJazoest(tokens.fb_dtsg),
    __spin_r:                 tokens.rev,
    __spin_b:                 "trunk",
    __spin_t:                 String(Math.floor(Date.now() / 1000)),
    fb_api_caller_class:      "RelayModern",
    fb_api_req_friendly_name: friendlyName,
    variables:                JSON.stringify(variables),
    server_timestamps:        "true",
    doc_id:                   docId,
    fb_dtsg:                  tokens.fb_dtsg,
  });

  const resp = await fetch(GQL_URL, {
    method:  "POST",
    headers: {
      Cookie:            cookieStr,
      "Content-Type":    "application/x-www-form-urlencoded",
      "User-Agent":      UA,
      Accept:            "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "X-FB-LSD":        tokens.lsd,
      "X-ASBD-ID":       "359341",
      Origin:            "https://www.facebook.com",
      Referer:           `https://www.facebook.com/marketplace/item/${sourceId}/`,
      "Sec-Fetch-Dest":  "empty",
      "Sec-Fetch-Mode":  "cors",
      "Sec-Fetch-Site":  "same-origin",
    },
    body,
  });

  if (!resp.ok) throw new Error(`GQL HTTP ${resp.status}`);

  const text = await resp.text();
  if (!text.trim()) return [];
  // Remover prefijo anti-CSRF que Facebook agrega: "for (;;);"
  const parsed = text.trim().split("\n").flatMap(line => {
    const clean = line.startsWith("for (;;);") ? line.slice(9) : line;
    try { return [JSON.parse(clean)]; } catch { return []; }
  });
  if (parsed.length === 0) {
    console.log(`    [raw GQL] ${text.slice(0, 200)}`);
  }
  // Lanzar error si FB responde con auth error
  const first = parsed[0] as Record<string, unknown> | undefined;
  if (first?.error === 1357001) throw new Error(`GQL error 1357001: sesión rechazada por Facebook`);
  return parsed;
}

// ── Traversal recursivo del response GQL ───────────────────────
function traverseGQL(obj: unknown, out: Record<string, unknown>): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) { obj.forEach(i => traverseGQL(i, out)); return; }
  const o = obj as Record<string, unknown>;

  if (typeof o.marketplace_listing_title === "string")
    out.title = o.marketplace_listing_title;

  const desc = (o.redacted_description ?? o.marketplace_listing_description) as Record<string, unknown> | undefined;
  if (typeof desc?.text === "string" && !out.description)
    out.description = desc.text;

  if (o.listing_price && typeof o.listing_price === "object") {
    const lp = o.listing_price as Record<string, unknown>;
    out.priceFormatted = lp.formatted_amount;
    out.priceAmount    = lp.amount;
    out.priceCurrency  = lp.currency;
  }

  if (o.location && typeof o.location === "object") {
    const loc = o.location as Record<string, unknown>;
    if (typeof loc.latitude  === "number") out.latitude  = loc.latitude;
    if (typeof loc.longitude === "number") out.longitude = loc.longitude;
    const rg = loc.reverse_geocode as Record<string, unknown> | undefined;
    if (rg?.city)  out.city  = rg.city;
    if (rg?.state) out.state = rg.state;
  }

  if (o.primary_listing_photo && typeof o.primary_listing_photo === "object") {
    const img = (o.primary_listing_photo as Record<string, unknown>).image as Record<string, unknown> | undefined;
    if (img?.uri) out.imageUrl = img.uri;
  }

  // marketplace_listing_seller puede ser null en el PDP — solo asignar si es objeto con name
  if (o.marketplace_listing_seller && typeof o.marketplace_listing_seller === "object") {
    const seller = o.marketplace_listing_seller as Record<string, unknown>;
    if (typeof seller.name === "string") out.sellerName = seller.name;
  }

  // listing_photos viene del query de fotos — extraer URIs de alta resolución
  if (Array.isArray(o.listing_photos) && (o.listing_photos as unknown[]).length > 0) {
    const urls = (o.listing_photos as Array<Record<string, unknown>>)
      .map(p => ((p.image as Record<string, unknown>)?.uri as string | undefined))
      .filter((u): u is string => typeof u === "string");
    if (urls.length > 0) out.photoUrls = urls;
  }

  for (const v of Object.values(o)) traverseGQL(v, out);
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("\n=== Test GQL Enrichment — solo lectura, sin escritura a DB ===\n");

  // 1. Cargar sesión completa (necesita PlaywrightStorageState para el browser)
  const rawSession = JSON.parse(
    fs.existsSync(PLAYWRIGHT_SESSION_FILE)
      ? fs.readFileSync(PLAYWRIGHT_SESSION_FILE, "utf-8")
      : fs.readFileSync(SESSION_FILE, "utf-8")
  ) as PlaywrightStorageState;
  const cookieStr = toCookieHeader(
    Object.fromEntries(rawSession.cookies.filter(c => c.domain.includes("facebook")).map(c => [c.name, c.value]))
  );
  console.log(`✓ ${rawSession.cookies.length} cookies cargadas`);

  // 2. Tokens via Playwright (único método confiable — HTTP puro es detectado)
  console.log("\nExtrayendo tokens de Facebook...");
  const tokens = await fetchTokensViaPlaywright(rawSession);
  const activeCookieStr = tokens.cookieStr;

  // 3. Leer 10 listings de la DB
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: listings, error } = await supabase
    .from("listings")
    .select("source_id, title, description, price_final_crc, location_city, location_latitude, location_longitude")
    .not("source_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!listings?.length) throw new Error("No se encontraron listings en la DB");

  console.log(`\n${listings.length} listings a probar via GQL:\n`);

  let ok = 0;
  let partial = 0;
  let fail = 0;

  const MAX_PHOTOS = 10;

  type Row = {
    source_id: string;
    status: string;
    titulo_gql: string;
    precio_gql: string;
    moneda_gql: string;
    ciudad_gql: string;
    latitude: string;
    longitude: string;
    descripcion_gql: string;
    n_fotos: string;
    listing_url: string;
    [key: string]: string; // foto_1 … foto_10
  };
  const rows: Row[] = [];

  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    console.log(`\n[${i + 1}/${listings.length}] ${l.source_id}`);
    console.log(`  DB →  título: "${l.title?.slice(0, 50) ?? "(vacío)"}"  |  ciudad: ${l.location_city ?? "(vacía)"}`);

    try {
      const pdpPages = await gqlCall(
        DOC_ID_PDP,
        "MarketplacePDPContainerQuery",
        { targetId: l.source_id, scale: 2 },
        tokens,
        activeCookieStr,
        l.source_id,
      );

      const result: Record<string, unknown> = {};
      pdpPages.forEach(p => traverseGQL(p, result));

      const photoPages = await gqlCall(
        DOC_ID_PHOTOS,
        "MarketplacePDPC2CMediaViewerWithImagesQuery",
        { targetId: l.source_id, scale: 2 },
        tokens,
        activeCookieStr,
        l.source_id,
      );
      photoPages.forEach(p => traverseGQL(p, result));

      if (!result.title && !result.description && !result.latitude) {
        console.log(`  ⚠  sin datos`);
        rows.push({ source_id: l.source_id, status: "sin datos", titulo_gql: "", precio_gql: "", moneda_gql: "", ciudad_gql: "", latitude: "", longitude: "", descripcion_gql: "", n_fotos: "0", listing_url: `https://www.facebook.com/marketplace/item/${l.source_id}/` });
        fail++;
      } else {
        const hasCoords = result.latitude != null;
        const hasDesc   = typeof result.description === "string" && (result.description as string).length > 10;
        const photoUrls = Array.isArray(result.photoUrls) ? result.photoUrls as string[] : [];

        console.log(`  ✓  título:      ${result.title ?? "(sin título)"}`);
        console.log(`  ✓  precio:      ${result.priceFormatted ?? result.priceAmount ?? "(sin precio)"} ${result.priceCurrency ?? ""}`);
        console.log(`  ✓  ciudad:      ${result.city ?? "(sin ciudad)"}${result.state ? `, ${result.state}` : ""}`);
        console.log(`  ✓  coords:      ${hasCoords ? `${result.latitude}, ${result.longitude}` : "(sin coords)"}`);
        console.log(`  ✓  desc:        ${hasDesc ? `${(result.description as string).slice(0, 100)}...` : "(sin desc)"}`);
        console.log(`  ✓  fotos:       ${photoUrls.length}`);

        const row: Row = {
          source_id:       l.source_id,
          status:          hasCoords && hasDesc ? "completo" : "parcial",
          titulo_gql:      String(result.title ?? ""),
          precio_gql:      String(result.priceAmount ?? result.priceFormatted ?? ""),
          moneda_gql:      String(result.priceCurrency ?? ""),
          ciudad_gql:      `${result.city ?? ""}${result.state ? `, ${result.state}` : ""}`,
          latitude:        String(result.latitude ?? ""),
          longitude:       String(result.longitude ?? ""),
          descripcion_gql: String(result.description ?? "").replace(/\r?\n/g, " "),
          n_fotos:         String(photoUrls.length),
          listing_url:     `https://www.facebook.com/marketplace/item/${l.source_id}/`,
        };
        for (let p = 0; p < MAX_PHOTOS; p++) {
          row[`foto_${p + 1}`] = photoUrls[p] ?? "";
        }
        rows.push(row);

        if (!hasDesc || !hasCoords) partial++;
        else ok++;
      }
    } catch (err) {
      console.log(`  ✗  ${(err as Error).message}`);
      rows.push({ source_id: l.source_id, status: "error", titulo_gql: "", precio_gql: "", moneda_gql: "", ciudad_gql: "", latitude: "", longitude: "", descripcion_gql: "", n_fotos: "0", listing_url: `https://www.facebook.com/marketplace/item/${l.source_id}/` });
      fail++;
    }

    if (i < listings.length - 1) await new Promise(r => setTimeout(r, 1_500));
  }

  // ── Exportar CSV ─────────────────────────────────────────────
  const csvPath = path.resolve("scripts/gql-test-results.csv");
  const photoHeaders = Array.from({ length: MAX_PHOTOS }, (_, i) => `foto_${i + 1}`);
  const headers = ["source_id","status","titulo_gql","precio_gql","moneda_gql",
                   "ciudad_gql","latitude","longitude","descripcion_gql","n_fotos",
                   ...photoHeaders,"listing_url"];

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csvContent = [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(String(r[h] ?? ""))).join(",")),
  ].join("\n");

  fs.writeFileSync(csvPath, "﻿" + csvContent, "utf-8"); // BOM para Excel

  console.log(`\n${"─".repeat(55)}`);
  console.log(`Completos (título+desc+coords): ${ok}`);
  console.log(`Parciales (faltan algunos campos): ${partial}`);
  console.log(`Fallidos:  ${fail}`);
  console.log(`\nCSV guardado en: ${csvPath}`);
  console.log(`(Nada escrito en la base de datos)`);
}

main().catch(err => {
  console.error("\n❌", err.message);
  process.exit(1);
});
