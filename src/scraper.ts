/**
 * scraper.ts — CR Market Scraper v3
 * Fases: Discovery → Enrichment → Verification
 *
 * Modos de ejecución:
 *   npx tsx src/scraper.ts                   → daily (discovery + enrich 150 + verify 150)
 *   npx tsx src/scraper.ts --mode=bulk       → primera corrida grande (sin caps)
 *   npx tsx src/scraper.ts --mode=enrich-existing → enriquece listings existentes sin fotos
 *   npx tsx src/scraper.ts --mode=verify-only → solo verifica listings activos
 */
import "dotenv/config";
import { Stagehand } from "@browserbasehq/stagehand";
import { chromium } from "patchright-core";
import { z } from "zod";
import { createClient }  from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import fs   from "fs";
import path from "path";
import nodemailer from "nodemailer";

// ── Run mode ──────────────────────────────────────────────────
const MODE = (process.argv.find(a => a.startsWith("--mode="))?.split("=")[1] ?? "daily") as
  "daily" | "bulk" | "verify-only" | "re-enrich";
const AI_ONLY        = process.argv.includes("--ai-only");
const DISCOVERY_ONLY = process.argv.includes("--discovery-only");
const TEST_MODE      = process.argv.includes("--test");
const IDS_FILTER = (() => {
  const arg = process.argv.find(a => a.startsWith("--ids="));
  if (!arg) return null;
  return new Set(arg.split("=")[1].split(",").map(s => s.trim()).filter(Boolean));
})();

const ENRICH_CAP    = TEST_MODE ? 10 : Infinity;
const VERIFY_CAP    = MODE === "bulk" ? 0        : 150;
const MAX_SCROLLS   = MODE === "bulk" ? 60       : 30;

console.log(`\n=== CR Market Scraper v3 — modo: ${TEST_MODE ? "TEST (10 listings)" : MODE.toUpperCase()} ===\n`);

// Module-level stagehand reference (set in main after init)
let _stagehand: {
  extract: <T>(instruction: string, schema: unknown) => Promise<T>;
  act: (opts: { action: string }) => Promise<void>;
} | null = null;

// ── Config ────────────────────────────────────────────────────
const GAM_CITIES = [
  { name: "San José",  url: "https://www.facebook.com/marketplace/sanjosecr/propertyrentals?sortBy=creation_time_descend&exact=false" },
  { name: "Heredia",   url: "https://www.facebook.com/marketplace/104033792966142/propertyrentals?sortBy=creation_time_descend&exact=false" },
  { name: "Alajuela",  url: "https://www.facebook.com/marketplace/103974792971201/propertyrentals?sortBy=creation_time_descend&exact=false" },
  { name: "Cartago",   url: "https://www.facebook.com/marketplace/112904588723975/propertyrentals?sortBy=creation_time_descend&exact=false" },
];

const SCROLL_PAUSE       = 2_200;
const ENRICH_DELAY_MIN   = 5_000;
const ENRICH_DELAY_MAX   = 10_000;
const VERIFY_DELAY_MIN   = 4_000;
const VERIFY_DELAY_MAX   = 8_000;
const EARLY_STOP_KNOWN   = 3;       // parar discovery si N IDs consecutivos son conocidos
const EXCHANGE_RATE      = 510;     // CRC/USD fallback

const SESSION_FILE           = path.resolve("fb-session.json");
const PLAYWRIGHT_SESSION_FILE = path.resolve("fb-playwright-session.json");

const GQL_DOC_PDP    = "35404930299120454";
const GQL_DOC_PHOTOS = "10059604367394414";
const GQL_URL        = "https://www.facebook.com/api/graphql/";
const GQL_UA         = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:137.0) Gecko/20100101 Firefox/137.0";
const GQL_DELAY_MIN  = 800;
const GQL_DELAY_MAX  = 1_500;

// ── Clients ───────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ── Types ─────────────────────────────────────────────────────
type RawPage = {
  evaluate:        <T>(fn: () => T) => Promise<T>;
  goto:            (url: string, opts?: Record<string, unknown>) => Promise<void>;
  waitForTimeout:  (ms: number) => Promise<void>;
  on:              (event: string, fn: (r: unknown) => void) => void;
  off:             (event: string, fn: (r: unknown) => void) => void;
  url:             () => string;
  locator:         (selector: string) => { click: (opts?: Record<string, unknown>) => Promise<void>; count: () => Promise<number> };
};

type GqlPartial = {
  id?: string; title?: string; description?: string; priceRaw?: string;
  currency?: "CRC" | "USD"; bedrooms?: number; bathrooms?: number;
  imageUrl?: string; locationCity?: string; locationProvince?: string;
  latitude?: number; longitude?: number; sellerName?: string;
};
type GqlAcc = Map<string, GqlPartial>;
type GqlTokens = { fb_dtsg: string; lsd: string; rev: string; userId: string; cookieStr: string };

// ── Session helpers (preserved from test-scraper.ts) ──────────
interface CookieEditorEntry {
  name: string; value: string; domain: string; path: string;
  expirationDate?: number; expires?: number;
  httpOnly: boolean; secure: boolean; sameSite: string | null; session?: boolean;
}
interface PlaywrightStorageState {
  cookies: Array<{ name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Strict"|"Lax"|"None" }>;
  origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
}
const CRITICAL_COOKIES = ["xs", "c_user", "datr"];

function parseCookieEntries(raw: CookieEditorEntry[] | PlaywrightStorageState): PlaywrightStorageState | null {
  const toSameSite = (s: string | null): "Strict"|"Lax"|"None" => {
    const m: Record<string,"Strict"|"Lax"|"None"> = { Strict:"Strict",strict:"Strict",Lax:"Lax",lax:"Lax",None:"None",no_restriction:"None",unspecified:"Lax" };
    return s ? (m[s] ?? "Lax") : "Lax";
  };
  if (Array.isArray(raw)) {
    return { cookies: (raw as CookieEditorEntry[]).filter(c => c.domain.includes("facebook")).map(c => ({
      name: c.name, value: c.value, domain: c.domain.startsWith(".") ? c.domain : `.${c.domain}`,
      path: c.path ?? "/", expires: Math.floor(c.expirationDate ?? c.expires ?? -1),
      httpOnly: c.httpOnly ?? false, secure: c.secure ?? true, sameSite: toSameSite(c.sameSite),
    })), origins: [] };
  }
  if ((raw as PlaywrightStorageState).cookies) return raw as PlaywrightStorageState;
  return null;
}

function loadStorageState(): PlaywrightStorageState | null {
  const envCookies = process.env.FB_SESSION_COOKIES;
  if (envCookies) {
    try {
      let decoded = envCookies;
      if (!envCookies.trim().startsWith("[") && !envCookies.trim().startsWith("{"))
        decoded = Buffer.from(envCookies, "base64").toString("utf-8");
      const state = parseCookieEntries(JSON.parse(decoded) as CookieEditorEntry[] | PlaywrightStorageState);
      if (state) { console.log(`✓ Sesión cargada desde env var (${state.cookies.length} cookies)`); return state; }
    } catch { console.warn("No se pudo parsear FB_SESSION_COOKIES"); }
  }
  if (fs.existsSync(PLAYWRIGHT_SESSION_FILE)) {
    const data = JSON.parse(fs.readFileSync(PLAYWRIGHT_SESSION_FILE, "utf-8")) as PlaywrightStorageState;
    if (data.cookies) { console.log(`✓ Sesión Playwright cargada (${data.cookies.length} cookies)`); return data; }
  }
  if (fs.existsSync(SESSION_FILE)) {
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8")) as CookieEditorEntry[] | PlaywrightStorageState;
    const state = parseCookieEntries(raw);
    if (state) { fs.writeFileSync(PLAYWRIGHT_SESSION_FILE, JSON.stringify(state, null, 2)); console.log(`✓ Cookie-Editor convertido (${state.cookies.length} cookies)`); return state; }
  }
  return null;
}

function checkCookieExpiry(state: PlaywrightStorageState): number {
  const now = Date.now() / 1000;
  const critical = state.cookies.filter(c => CRITICAL_COOKIES.includes(c.name) && c.expires > 0)
    .map(c => ({ name: c.name, daysLeft: Math.floor((c.expires - now) / 86400) }));
  if (critical.some(c => c.daysLeft <= 0)) { console.error("⛔ SESIÓN EXPIRADA — renovar cookies"); process.exit(1); }
  const min = Math.min(...critical.map(c => c.daysLeft));
  if (min <= 30) console.warn(`⚠️  Sesión expira en ${min} días — renovar pronto`);
  else console.log(`✓ Sesión válida por ${min} días`);
  return min;
}

// ── GQL enrichment via HTTP ────────────────────────────────────
function computeJazoest(fb_dtsg: string): string {
  return "2" + String(fb_dtsg.split("").reduce((s, c) => s + c.charCodeAt(0), 0));
}

async function extractGqlTokensViaPlaywright(storageState: PlaywrightStorageState): Promise<GqlTokens> {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ storageState });
  const page    = await ctx.newPage();
  await page.goto("https://www.facebook.com/marketplace/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2_000);

  const tokens = await page.evaluate(() => {
    const req = (window as unknown as Record<string, ((id: string) => Record<string,unknown>) | undefined>).require;
    const dtsgInit   = req?.("DTSGInitialData")?.token as string | undefined;
    const dtsgConfig = (req?.("MRequestConfig")?.dtsg as Record<string,unknown> | undefined)?.token as string | undefined;
    const fb_dtsg    = dtsgInit ?? dtsgConfig?.split(":")?.[0];
    const lsd        = req?.("LSD")?.token as string | undefined;
    const rev        = String(req?.("SiteData")?.client_revision ?? "1037953373");
    const userId     = document.cookie.match(/c_user=(\d+)/)?.[1]
                    ?? String((req?.("CurrentUserInitialData") as Record<string,unknown> | undefined)?.USER_ID ?? "0");
    return { fb_dtsg, lsd, rev, userId };
  }) as { fb_dtsg?: string; lsd?: string; rev: string; userId: string };

  const freshCookies = await ctx.cookies(["https://www.facebook.com"]);
  await browser.close();

  if (!tokens.fb_dtsg) throw new Error("No se pudo extraer fb_dtsg — verificar sesión");
  if (!tokens.lsd)     throw new Error("No se pudo extraer lsd");

  return {
    fb_dtsg:   tokens.fb_dtsg,
    lsd:       tokens.lsd!,
    rev:       tokens.rev,
    userId:    tokens.userId,
    cookieStr: freshCookies.map(c => `${c.name}=${c.value}`).join("; "),
  };
}

async function gqlHttpCall(
  docId: string,
  friendlyName: string,
  variables: Record<string, unknown>,
  tokens: GqlTokens,
  sourceId: string,
): Promise<unknown[]> {
  const body = new URLSearchParams({
    av: tokens.userId, __user: tokens.userId, __a: "1", __req: "1",
    __ccg: "GOOD", __rev: tokens.rev, __comet_req: "15",
    __crn: "comet.fbweb.CometMarketplaceSearchRoute",
    lsd: tokens.lsd, jazoest: computeJazoest(tokens.fb_dtsg),
    __spin_r: tokens.rev, __spin_b: "trunk",
    __spin_t: String(Math.floor(Date.now() / 1000)),
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: friendlyName,
    variables: JSON.stringify(variables),
    server_timestamps: "true",
    doc_id: docId,
    fb_dtsg: tokens.fb_dtsg,
  });

  const resp = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      Cookie:            tokens.cookieStr,
      "Content-Type":    "application/x-www-form-urlencoded",
      "User-Agent":      GQL_UA,
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
  const parsed = text.trim().split("\n").flatMap(line => {
    const clean = line.startsWith("for (;;);") ? line.slice(9) : line;
    try { return [JSON.parse(clean)]; } catch { return []; }
  });
  const first = parsed[0] as Record<string, unknown> | undefined;
  if (first?.error === 1357001) throw new Error("GQL error 1357001: sesión rechazada");
  return parsed;
}

function traverseGqlEnrich(obj: unknown, out: Record<string, unknown>): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) { obj.forEach(i => traverseGqlEnrich(i, out)); return; }
  const o = obj as Record<string, unknown>;

  if (typeof o.marketplace_listing_title === "string") out.title = o.marketplace_listing_title;

  const desc = (o.redacted_description ?? o.marketplace_listing_description) as Record<string, unknown> | undefined;
  if (typeof desc?.text === "string" && !out.description) out.description = desc.text;

  if (o.listing_price && typeof o.listing_price === "object") {
    const lp = o.listing_price as Record<string, unknown>;
    if (lp.amount != null) out.priceRaw = `${lp.currency ?? "CRC"} ${lp.amount}`;
    out.currency = lp.currency;
  }

  if (o.location && typeof o.location === "object") {
    const loc = o.location as Record<string, unknown>;
    if (typeof loc.latitude  === "number") out.latitude  = loc.latitude;
    if (typeof loc.longitude === "number") out.longitude = loc.longitude;
    const rg = loc.reverse_geocode as Record<string, unknown> | undefined;
    if (rg?.city) out.locationCity = rg.city;
  }

  const home = o.home_listing as { num_bedrooms?: number; num_bathrooms?: number } | undefined;
  if (home?.num_bedrooms  != null) out.bedrooms  = home.num_bedrooms;
  if (home?.num_bathrooms != null) out.bathrooms = home.num_bathrooms;

  if (o.marketplace_listing_seller && typeof o.marketplace_listing_seller === "object") {
    const seller = o.marketplace_listing_seller as Record<string, unknown>;
    if (typeof seller.name === "string") out.sellerName = seller.name;
  }

  if (Array.isArray(o.listing_photos) && (o.listing_photos as unknown[]).length > 0) {
    const urls = (o.listing_photos as Array<Record<string, unknown>>)
      .map(p => ((p.image as Record<string, unknown>)?.uri as string | undefined))
      .filter((u): u is string => typeof u === "string");
    if (urls.length > 0) out.imageUrlsFb = urls;
  }

  for (const v of Object.values(o)) traverseGqlEnrich(v, out);
}

async function gqlEnrichListing(sourceId: string, tokens: GqlTokens): Promise<{
  title: string | null; description: string | null; sellerName: string | null;
  listingStatus: null; imageUrlsFb: string[]; bedrooms: number | null;
  bathrooms: number | null; locationCity: string | null; priceRaw: string | null;
  latitude: number | null; longitude: number | null; usedStagehand: false;
} | null> {
  try {
    const out: Record<string, unknown> = {};
    const pdpPages = await gqlHttpCall(
      GQL_DOC_PDP, "MarketplacePDPContainerQuery",
      { targetId: sourceId, scale: 2 }, tokens, sourceId,
    );
    pdpPages.forEach(p => traverseGqlEnrich(p, out));

    const photoPages = await gqlHttpCall(
      GQL_DOC_PHOTOS, "MarketplacePDPC2CMediaViewerWithImagesQuery",
      { targetId: sourceId, scale: 2 }, tokens, sourceId,
    );
    photoPages.forEach(p => traverseGqlEnrich(p, out));

    return {
      title:         (out.title        as string | null) ?? null,
      description:   (out.description  as string | null) ?? null,
      sellerName:    (out.sellerName   as string | null) ?? null,
      listingStatus: null,
      imageUrlsFb:   Array.isArray(out.imageUrlsFb) ? out.imageUrlsFb as string[] : [],
      bedrooms:      (out.bedrooms     as number | null) ?? null,
      bathrooms:     (out.bathrooms    as number | null) ?? null,
      locationCity:  (out.locationCity as string | null) ?? null,
      priceRaw:      (out.priceRaw     as string | null) ?? null,
      latitude:      (out.latitude     as number | null) ?? null,
      longitude:     (out.longitude    as number | null) ?? null,
      usedStagehand: false,
    };
  } catch (err) {
    console.warn(`\n  ⚠ gqlEnrichListing error ${sourceId}: ${(err as Error).message}`);
    return null;
  }
}

// ── GQL traversal ─────────────────────────────────────────────
function traverseGQL(obj: unknown, acc: GqlAcc, cityName: string): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) { obj.forEach(i => traverseGQL(i, acc, cityName)); return; }
  const o = obj as Record<string, unknown>;
  if (typeof o.id === "string" && /^\d{10,}$/.test(o.id) &&
    (o.listing_price !== undefined || o.marketplace_listing_title !== undefined)) {
    const ex = acc.get(o.id) ?? {};
    const price = (o.listing_price as { amount?: string; currency?: string } | undefined) ?? {};
    const loc = o.location as { latitude?: number; longitude?: number; reverse_geocode?: { city?: string; state?: string } } | undefined;
    const photo = ((o.primary_listing_photo as { image?: { uri?: string } } | undefined)?.image?.uri);
    const home   = o.home_listing as { num_bedrooms?: number; num_bathrooms?: number } | undefined;
    const seller = (o.marketplace_listing_seller as { name?: string } | undefined);
    acc.set(o.id, {
      ...ex, id: o.id,
      title:            (o.marketplace_listing_title as string | undefined) ?? ex.title,
      description:      (o.description as string | undefined) ?? ex.description,
      priceRaw:         price.amount != null ? `${price.currency ?? "CRC"} ${price.amount}` : ex.priceRaw,
      currency:         (price.currency as "CRC"|"USD" | undefined) ?? ex.currency,
      imageUrl:         photo ?? ex.imageUrl,
      bedrooms:         home?.num_bedrooms ?? ex.bedrooms,
      bathrooms:        home?.num_bathrooms ?? ex.bathrooms,
      locationCity:     loc?.reverse_geocode?.city ?? ex.locationCity,
      locationProvince: loc?.reverse_geocode?.state ?? ex.locationProvince,
      latitude:         loc?.latitude ?? ex.latitude,
      longitude:        loc?.longitude ?? ex.longitude,
      sellerName:       (typeof seller?.name === "string" ? seller.name : undefined) ?? ex.sellerName,
    });
  }
  for (const v of Object.values(o)) traverseGQL(v, acc, cityName);
}

function normalizePrice(raw: string | null): { priceCRC: number|null; priceUSD: number|null; currency: "CRC"|"USD"|null } {
  if (!raw) return { priceCRC: null, priceUSD: null, currency: null };
  const match = raw.match(/\d{1,3}(?:[,\.]\d{3})+|\d{4,}/);
  if (!match) return { priceCRC: null, priceUSD: null, currency: null };
  const amount = parseFloat(match[0].replace(/,/g, ""));
  if (isNaN(amount) || amount <= 0) return { priceCRC: null, priceUSD: null, currency: null };
  const hasCRC = /CRC|₡|colones/i.test(raw);
  const hasUSD = /\$|USD/i.test(raw);
  const isUSD  = (hasUSD && !hasCRC) || (!hasCRC && amount < 10_000);
  if (isUSD) return { priceCRC: Math.round(amount * EXCHANGE_RATE), priceUSD: Math.round(amount), currency: "USD" };
  return { priceCRC: Math.round(amount), priceUSD: Math.round(amount / EXCHANGE_RATE), currency: "CRC" };
}

// ── Cloudinary upload (single photo) ─────────────────────────
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;

async function uploadPhoto(fbUrl: string, sourceId: string, idx: number): Promise<string | null> {
  const publicId = `listing-${sourceId}-${idx}`;
  try {
    const r = await cloudinary.uploader.upload(fbUrl, { folder: "cr-market", public_id: publicId, overwrite: false, resource_type: "image", fetch_format: "auto", quality: "auto:good", transformation: [{ width: 1200, crop: "limit" }] });
    return r.secure_url;
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("already exists")) return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/cr-market/${publicId}`;
    return null;
  }
}

function cleanFbUrl(url: string): string {
  try { const u = new URL(url); return `https://${u.hostname}${u.pathname}`; } catch { return url; }
}

// ── AI extraction (batched) ───────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

async function aiExtractBatch(items: Array<{ id: string; title: string; description: string }>): Promise<Record<string, Record<string, unknown>>> {
  const prompt = `Analizá estos ${items.length} anuncios de propiedades en Costa Rica.
Para CADA uno retorná un JSON con:
- id (exacto), transactionType ("alquiler"|"venta"|"ambos"|"desconocido"),
  rentPriceCRC, rentPriceUSD, salePriceCRC, salePriceUSD (números o null),
  bedroomsAI, bathroomsAI (números o null), propertyTypeAI ("Apartamento"|"Casa"|"Oficina"|"Local"|"Bodega"|"Habitación"|"Terreno"|"Otro"),
  squareMeters, parking, floor (números o null),
  furnished ("amueblado"|"semi"|"sin muebles"|null),
  petsAllowed (bool|null), utilitiesIncluded (array), amenities (array),
  depositCRC (número|null), contactPhone (string|null), condominioName (string|null),
  floor (número de piso o nivel, número o null),
  maxPeople (máximo de personas permitidas, número o null),
  availability (cuándo está disponible, texto corto o null, ej: "inmediata", "junio 2025"),
  restrictions (array de restricciones, ej: ["sin niños", "sin mascotas", "solo parejas"])

Retorná SOLO un JSON array, sin markdown.

ANUNCIOS:
${items.map((l, i) => `[${i+1}] ID: ${l.id}\nTítulo: ${l.title}\nDesc: ${l.description.slice(0,1200)}`).join("\n\n---\n\n")}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json() as { content: { text: string }[] };
  const text = data.content[0]?.text ?? "[]";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return {};
  const results = JSON.parse(match[0]) as Array<Record<string, unknown>>;
  return Object.fromEntries(results.map(r => [r.id as string, r]));
}

// ── Enrich one listing (visit page, extract all data) ─────────
async function enrichListingPage(page: RawPage, sourceId: string, _listingUrl: string): Promise<{
  title: string | null;
  description: string | null;
  sellerName: string | null;
  listingStatus: string | null;
  imageUrlsFb: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  locationCity: string | null;
  priceRaw: string | null;
  latitude: number | null;
  longitude: number | null;
  usedStagehand: boolean;
} | null> {
  try {
    const cleanUrl = `https://www.facebook.com/marketplace/item/${sourceId}/`;
    await page.goto(cleanUrl, { waitUntil: "domcontentloaded", timeoutMs: 25_000 });
    await page.waitForTimeout(10_000 + Math.random() * 1_500);
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2_000);

    // Check if listing is no longer available
    const isUnavailable = await page.evaluate(() => {
      const t = document.body?.textContent ?? "";
      return t.includes("isn't available anymore") ||
             t.includes("no longer available") ||
             t.includes("This content isn't available") ||
             t.includes("Page Not Found");
    }) as boolean;

    if (isUnavailable) {
      return {
        title: null, description: null, sellerName: null,
        listingStatus: "UNAVAILABLE",
        imageUrlsFb: [], bedrooms: null, bathrooms: null,
        locationCity: null, priceRaw: null,
        latitude: null, longitude: null, usedStagehand: false,
      };
    }

    // ── Phase A: click "See more" if present ──────────────────
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll<HTMLElement>('div[role="button"]'))
        .find(b => /^(See more|Ver más)$/.test(b.innerText?.trim() ?? ""));
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);

    // ── Phase B: DOM extraction (deterministic, fast) ─────────
    // XPathResult numeric constants (avoid XPathResult.XXX — not available in Stagehand eval context)
    // FIRST_ORDERED_NODE_TYPE = 9, ORDERED_NODE_SNAPSHOT_TYPE = 7
    const domData = await page.evaluate(() => {
      const $x = (xp: string): HTMLElement | null =>
        document.evaluate(xp, document, null, 9, null).singleNodeValue as HTMLElement | null;

      const title       = (document.querySelector('div[role="main"] h1') as HTMLElement | null)?.innerText?.trim() ?? null;
      const priceRaw    = (document.querySelector('div[role="main"] h1 + div') as HTMLElement | null)?.innerText?.trim() ?? null;
      const description = $x("//span[normalize-space(text())='Description']/following::span[@dir='auto'][1]")?.innerText?.trim() ?? null;
      const sellerName  = $x("//span[contains(text(),'Joined Facebook in')]/ancestor::div[3]//a[@role='link']//span[1]")?.innerText?.trim() ?? null;

      const locationCity = Array.from(document.querySelectorAll('div[role="main"] span'))
        .map(s => (s as HTMLElement).innerText?.trim() ?? "")
        .find(t => /^[A-Za-zÀ-ÿ\s.\-]+,\s*[A-Z]{2}-[A-Z]{1,3}$/.test(t)) ?? null;

      // Listing status badge: sibling of <h1> inside listing header
      const STATES = ["Rented","Sold","Pending","Reserved","Alquilado","Vendido","Pendiente","Reservado"];
      const statusSnap = document.evaluate("//div[@role='main']//h1/parent::*/span[@dir='auto']", document, null, 7, null);
      let listingStatus: string | null = null;
      for (let si = 0; si < statusSnap.snapshotLength; si++) {
        const t = (statusSnap.snapshotItem(si) as HTMLElement)?.innerText?.trim() ?? "";
        if (STATES.includes(t)) { listingStatus = t; break; }
      }

      // Coordinates from script tags
      const scriptContent = Array.from(document.querySelectorAll("script")).map(s => s.textContent ?? "").join("\n");
      const coordMatch = scriptContent.match(/"latitude"\s*:\s*(-?\d+\.\d+)[^}]{0,200}?"longitude"\s*:\s*(-?\d+\.\d+)/);
      const lat = coordMatch ? parseFloat(coordMatch[1]) : null;
      const lng = coordMatch ? parseFloat(coordMatch[2]) : null;

      // Photos: aria-label thumbnails first, fbcdn fallback
      const imgSet = new Set<string>();
      document.querySelectorAll<HTMLImageElement>('div[aria-label^="Thumbnail "] img').forEach(img => {
        if (img.src?.includes("fbcdn.net")) imgSet.add(img.src);
      });
      if (imgSet.size === 0) {
        document.querySelectorAll<HTMLImageElement>("img").forEach(img => {
          const src = img.src ?? "";
          if (src.includes("fbcdn.net") &&
              (src.includes("t45.5328") || src.includes("t39.84726") || src.includes("t45.1560")) &&
              !src.includes("p32x32") && !src.includes("p50x50") && !src.includes("p40x40") &&
              src.length > 60) imgSet.add(src);
        });
      }

      // Bedrooms / bathrooms from page text
      const allText = [...new Set(
        Array.from(document.querySelectorAll<HTMLElement>("span, p"))
          .map(el => el.textContent?.trim() ?? "")
          .filter(t => t.length > 3 && t.length < 3000)
      )].join(" ");
      const bedMatch  = allText.match(/(\d+(?:\.\d+)?)\s*(?:habitaci[oó]n|habitaciones|cuarto|cuartos|bed(?:room)?s?)/i);
      const bathMatch = allText.match(/(\d+(?:\.\d+)?)\s*(?:ba[ñn]o|ba[ñn]os|bath)/i);

      return {
        title, priceRaw, description, sellerName, locationCity, listingStatus, lat, lng,
        imgs:      Array.from(imgSet),
        bedrooms:  bedMatch  ? parseFloat(bedMatch[1])  : null,
        bathrooms: bathMatch ? parseFloat(bathMatch[1]) : null,
      };
    }) as {
      title: string|null; priceRaw: string|null; description: string|null;
      sellerName: string|null; locationCity: string|null; listingStatus: string|null;
      lat: number|null; lng: number|null; imgs: string[];
      bedrooms: number|null; bathrooms: number|null;
    };

    // ── Phase C: Stagehand fallback only if critical fields missing ──
    let finalTitle       = domData.title;
    let finalDescription = domData.description;
    let finalSellerName  = domData.sellerName;
    let finalStatus      = domData.listingStatus;
    let usedStagehand    = false;

    if (!domData.title || !domData.description) {
      usedStagehand = true;
      const extractTimeout = new Promise<{ title: null; description: null; sellerName: null; listingStatus: null }>(
        resolve => setTimeout(() => resolve({ title: null, description: null, sellerName: null, listingStatus: null }), 30_000)
      );
      const sh = await Promise.race([
        _stagehand!.extract<{ title: string|null; description: string|null; sellerName: string|null; listingStatus: string|null }>(
          `Extract from this Facebook Marketplace property listing:
1. title: The actual listing title shown in bold at the top of the right panel (not navigation menus)
2. description: The full text written by the seller in the "Description" section only
3. sellerName: The seller's full name from the "Seller information" section
4. listingStatus: If there is a badge/label saying "Rented", "Sold", "Vendido", "Alquilado" etc., return that exact text. Otherwise return null.`,
          z.object({
            title:         z.string().nullable(),
            description:   z.string().nullable(),
            sellerName:    z.string().nullable(),
            listingStatus: z.string().nullable(),
          }),
        ).catch(() => ({ title: null, description: null, sellerName: null, listingStatus: null })),
        extractTimeout,
      ]);
      finalTitle       = domData.title       ?? sh.title;
      finalDescription = domData.description ?? sh.description;
      finalSellerName  = domData.sellerName  ?? sh.sellerName;
      finalStatus      = domData.listingStatus ?? sh.listingStatus;
    }

    const uniqueImgs = Array.from(new Map(
      domData.imgs.map(url => {
        const base = url.split("?")[0].split("/").pop() ?? url;
        return [base, url];
      })
    ).values()).slice(0, 10);

    return {
      title:         finalTitle,
      description:   finalDescription,
      sellerName:    finalSellerName,
      listingStatus: finalStatus,
      imageUrlsFb:   uniqueImgs,
      bedrooms:      domData.bedrooms,
      bathrooms:     domData.bathrooms,
      locationCity:  domData.locationCity,
      priceRaw:      domData.priceRaw,
      latitude:      domData.lat,
      longitude:     domData.lng,
      usedStagehand,
    };
  } catch (err) {
    console.warn(`\n  ⚠ enrichListingPage error ${sourceId}: ${(err as Error).message}`);
    return null;
  }
}

// ── Upsert a listing to Supabase ─────────────────────────────
async function upsertListing(data: Record<string, unknown>): Promise<string | null> {
  const { data: rows, error } = await supabase
    .from("listings")
    .upsert(data, { onConflict: "source_id,transaction_type", ignoreDuplicates: false })
    .select("id");
  if (error) { console.warn(`\n  ⚠ upsert error: ${error.message?.slice(0, 80)}`); return null; }
  return rows?.[0]?.id ?? null;
}

// ── PHASE 1: DISCOVERY ────────────────────────────────────────
async function phaseDiscovery(page: RawPage, gqlAcc: GqlAcc, knownIds: Set<string>): Promise<string[]> {
  console.log("\n── FASE 1: Discovery ────────────────────────────────");
  const discoveredIds = new Set<string>();

  for (const city of GAM_CITIES) {
    console.log(`\n  ${city.name}...`);
    try {
      await page.goto(city.url, { waitUntil: "domcontentloaded", timeout: 30_000 } as Record<string,unknown>);
      await page.waitForTimeout(4_000);

      const landedUrl = page.url();
      if (landedUrl.includes("login") || landedUrl.includes("checkpoint") || landedUrl.includes("two_step_verification")) {
        console.warn(`  ⚠ ${city.name}: redirigido a login — saltando`);
        continue;
      }

      // ── Set 40km radius via UI ──────────────────────────────
      try {
        const filterBtn = page.locator('[aria-label*="Filtros"], [aria-label*="Filter"], button:has-text("Filters")');
        if (await filterBtn.count() > 0) {
          await filterBtn.click({ timeout: 5_000 });
          await page.waitForTimeout(1_500);

          // Look for radius/distance filter
          const radiusInput = page.locator('input[type="range"], input[aria-label*="Radius"], input[aria-label*="Radio"]');
          if (await radiusInput.count() > 0) {
            // Try to set 40km — interactions vary by FB UI version
            await radiusInput.click();
          }

          // Look for 40km option
          const option40 = page.locator('[data-value="40"], option[value="40"], [aria-label*="40"]');
          if (await option40.count() > 0) await option40.click({ timeout: 3_000 });

          // Apply/close filters
          const applyBtn = page.locator('button:has-text("Apply"), button:has-text("Aplicar"), [aria-label*="Apply"]');
          if (await applyBtn.count() > 0) await applyBtn.click({ timeout: 3_000 });
          await page.waitForTimeout(2_000);
        }
      } catch { /* radio filter not critical — continue */ }

      // Sort is applied via URL param sortBy=creation_time_descend — no UI click needed
      let consecutiveKnown = 0;
      let earlyStop = false;

      for (let scroll = 0; scroll < MAX_SCROLLS; scroll++) {
        const ids = await page.evaluate(() => {
          return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/marketplace/item/"]'))
            .map(a => { const m = a.href.match(/\/item\/(\d+)\//); return m?.[1] ?? null; })
            .filter((id): id is string => id !== null);
        }) as string[];

        let newCount = 0;
        for (const id of [...ids]) {
          if (!discoveredIds.has(id)) {
            discoveredIds.add(id);
            newCount++;
            if (knownIds.has(id)) consecutiveKnown++;
            else consecutiveKnown = 0;
          }
        }

        process.stdout.write(`\r  Scroll ${scroll+1}/${MAX_SCROLLS} | ${discoveredIds.size} IDs | +${newCount} nuevos | ${consecutiveKnown} conocidos consecutivos   `);

        // Early termination: 3+ consecutive known IDs means we reached existing data
        if (MODE !== "bulk" && consecutiveKnown >= EARLY_STOP_KNOWN) {
          process.stdout.write(`\n  ✓ Early termination — llegamos a datos conocidos\n`);
          earlyStop = true;
          break;
        }

        if (newCount === 0 && scroll > 2) { process.stdout.write("\n  ✓ Sin nuevos — fin del scroll\n"); break; }

        await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2.5));
        await page.waitForTimeout(SCROLL_PAUSE);
        if (earlyStop) break;
      }

      console.log(`  ${city.name}: ${discoveredIds.size} IDs totales`);
    } catch (err) {
      console.warn(`  ⚠ Error en ${city.name}: ${(err as Error).message?.slice(0, 80)}`);
    }
  }

  // Filter: only IDs NOT already in DB
  const newIds = [...discoveredIds].filter(id => !knownIds.has(id));
  console.log(`\n  ✓ Discovery completo: ${discoveredIds.size} total | ${newIds.length} nuevos | ${discoveredIds.size - newIds.length} ya conocidos`);
  return newIds;
}

// ── PHASE 2: ENRICHMENT ───────────────────────────────────────
const AI_BATCH_SIZE = 10;

type CollectedItem = {
  sourceId: string;
  gql: GqlPartial | undefined;
  pageData: Awaited<ReturnType<typeof enrichListingPage>>;
  cloudUrls: string[];
  cleanUrls: string[];
  priceRaw: string | null;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  latitude: number | null;
  longitude: number | null;
};

function buildRow(c: CollectedItem, aiData: Record<string, unknown>): Record<string, unknown> {
  const price      = normalizePrice(c.priceRaw);
  const transType  = (aiData.transactionType as string | undefined) === "ambos" ? "alquiler" : ((aiData.transactionType as string | undefined) ?? "alquiler");
  const finalCRC   = (aiData.rentPriceCRC as number|null) ?? price.priceCRC;
  const finalUSD   = (aiData.rentPriceUSD as number|null) ?? price.priceUSD;
  const listingStatus = c.pageData?.listingStatus ?? null;
  const isInactive = /rent(ed|ado)|sold|vendid[ao]|alquilad[ao]|UNAVAILABLE/i.test(listingStatus ?? "");

  let qScore = 0;
  if (finalCRC && finalCRC > 0) qScore++;
  if (c.description && c.description.length > 30) qScore++;
  if (c.gql?.locationCity || c.pageData?.locationCity) qScore++;
  if (c.cloudUrls.length > 0) qScore++;
  if (c.bedrooms != null || aiData.bedroomsAI != null) qScore++;

  return {
    source_id:          c.sourceId,
    source_url:         `https://www.facebook.com/marketplace/item/${c.sourceId}/?ref=category_feed`,
    listing_url:        `https://www.facebook.com/marketplace/item/${c.sourceId}/`,
    transaction_type:   transType,
    title:              c.pageData?.title ?? c.gql?.title ?? null,
    description:        c.description,
    price_raw:          c.priceRaw,
    price_crc:          price.priceCRC,
    price_usd:          price.priceUSD,
    price_ai_crc:       toInt(aiData.rentPriceCRC),
    price_ai_usd:       toInt(aiData.rentPriceUSD),
    price_final_crc:    finalCRC,
    price_final_usd:    finalUSD,
    currency:           c.gql?.currency ?? price.currency,
    bedrooms_ai:        toInt(aiData.bedroomsAI),
    bathrooms_ai:       toInt(aiData.bathroomsAI),
    property_type:      (aiData.propertyTypeAI as string|null) ?? null,
    property_type_ai:   (aiData.propertyTypeAI as string|null) ?? null,
    square_meters:      toInt(aiData.squareMeters),
    parking:            toInt(aiData.parking),
    floor:              toInt(aiData.floor),
    furnished:          (aiData.furnished as string|null) ?? null,
    pets_allowed:       typeof aiData.petsAllowed === "boolean" ? aiData.petsAllowed : null,
    utilities_included: Array.isArray(aiData.utilitiesIncluded) ? aiData.utilitiesIncluded : [],
    amenities:          Array.isArray(aiData.amenities) ? aiData.amenities : [],
    deposit_crc:        toInt(aiData.depositCRC),
    contact_phone:      (aiData.contactPhone as string|null) ?? null,
    condominio_name:    (aiData.condominioName as string|null) ?? null,
    max_people:         toInt(aiData.maxPeople),
    availability:       (aiData.availability as string|null) ?? null,
    restrictions:       Array.isArray(aiData.restrictions) ? aiData.restrictions : [],
    seller_name:        c.pageData?.sellerName ?? c.gql?.sellerName ?? null,
    listing_status:     listingStatus,
    image_urls_fb:      c.cleanUrls,
    image_urls:         c.cloudUrls,
    location_city:      c.gql?.locationCity ?? c.pageData?.locationCity ?? null,
    location_province:  c.gql?.locationProvince ?? null,
    location_latitude:  c.gql?.latitude ?? c.latitude ?? null,
    location_longitude: c.gql?.longitude ?? c.longitude ?? null,
    data_source:        "graphql+visit",
    quality_score:      Math.max(qScore, 1),
    is_published:       qScore >= 3,
    is_active:          !isInactive,
    ...(isInactive ? { inactive_detected_at: new Date().toISOString() } : {}),
    last_seen_at:       new Date().toISOString(),
    last_verified_at:   new Date().toISOString(),
  };
}

async function phaseEnrichment(
  page: RawPage,
  gqlAcc: GqlAcc,
  idsToEnrich: string[],
  tokens: GqlTokens | null,
): Promise<{ enriched: number; errors: number }> {
  console.log(`\n── FASE 2: Enrichment ───────────────────────────────`);
  const ids = idsToEnrich.slice(0, ENRICH_CAP);
  console.log(`  ${ids.length} listings a enriquecer (cap: ${ENRICH_CAP === Infinity ? "sin límite" : ENRICH_CAP}, AI batch: ${AI_BATCH_SIZE})`);

  let enriched = 0;
  let errors   = 0;

  for (let batchStart = 0; batchStart < ids.length; batchStart += AI_BATCH_SIZE) {
    const batchIds = ids.slice(batchStart, batchStart + AI_BATCH_SIZE);
    const collected: CollectedItem[] = [];

    // Phase A: Visit pages and upload photos for this batch
    for (let j = 0; j < batchIds.length; j++) {
      const sourceId = batchIds[j];
      const globalIdx = batchStart + j;
      process.stdout.write(`\r  [${globalIdx+1}/${ids.length}] ${sourceId}   `);

      const pageData = tokens
        ? await gqlEnrichListing(sourceId, tokens)
        : await enrichListingPage(page, sourceId, `https://www.facebook.com/marketplace/item/${sourceId}/`);
      const gql      = gqlAcc.get(sourceId);

      const rawUrls  = pageData?.imageUrlsFb ?? (gql?.imageUrl ? [gql.imageUrl] : []);
      const cloudUrls: string[] = [];
      const cleanUrls: string[] = [];
      for (let idx = 0; idx < rawUrls.length; idx++) {
        cleanUrls.push(cleanFbUrl(rawUrls[idx]));
        const cloudUrl = await uploadPhoto(rawUrls[idx], sourceId, idx);
        if (cloudUrl) cloudUrls.push(cloudUrl);
      }

      if (TEST_MODE && pageData) {
        console.log(`\n  ── Listing ${globalIdx+1}: ${sourceId}`);
        console.log(`     Título:      ${pageData.title ?? "(vacío)"}`);
        console.log(`     Descripción: ${pageData.description ? `${pageData.description.slice(0, 80)}… (${pageData.description.length} chars)` : "(vacío)"}`);
        console.log(`     Precio raw:  ${pageData.priceRaw ?? "(vacío)"}`);
        console.log(`     Vendedor:    ${pageData.sellerName ?? "(vacío)"}`);
        console.log(`     Ubicación:   ${pageData.locationCity ?? "(vacío)"}`);
        console.log(`     Coords:      ${pageData.latitude != null ? `${pageData.latitude}, ${pageData.longitude}` : "(no encontradas)"}`);
        console.log(`     Fotos:       ${rawUrls.length} encontradas, ${cloudUrls.length} subidas`);
        console.log(`     Status:      ${pageData.listingStatus ?? "activo"}`);
        console.log(`     Stagehand:   ${pageData.usedStagehand ? "⚠ usado como fallback" : "✓ no necesario"}`);
        if (gql) console.log(`     GQL:         ✓ precio=${gql.priceRaw} hab=${gql.bedrooms}`);
      }

      collected.push({
        sourceId, gql, pageData,
        cloudUrls, cleanUrls,
        priceRaw:    gql?.priceRaw ?? pageData?.priceRaw ?? null,
        description: pageData?.description ?? gql?.description ?? null,
        bedrooms:    pageData?.bedrooms ?? gql?.bedrooms ?? null,
        bathrooms:   pageData?.bathrooms ?? gql?.bathrooms ?? null,
        latitude:    pageData?.latitude ?? gql?.latitude ?? null,
        longitude:   pageData?.longitude ?? gql?.longitude ?? null,
      });

      const delay = tokens
        ? GQL_DELAY_MIN + Math.random() * (GQL_DELAY_MAX - GQL_DELAY_MIN)
        : ENRICH_DELAY_MIN + Math.random() * (ENRICH_DELAY_MAX - ENRICH_DELAY_MIN);
      await new Promise(r => setTimeout(r, delay));
    }

    // Phase B: One AI call for all valid descriptions in this batch
    const aiInputs = collected
      .filter(c => c.description && c.description.length > 10 && c.description !== "<UNKNOWN>")
      .map(c => ({ id: c.sourceId, title: c.gql?.title ?? "", description: c.description! }));

    let aiResults: Record<string, Record<string, unknown>> = {};
    if (aiInputs.length > 0) {
      try {
        aiResults = await aiExtractBatch(aiInputs);
      } catch { /* AI failure is non-fatal — rows get saved with DOM-only data */ }
    }

    // Phase C: Upsert all listings in this batch
    for (const c of collected) {
      const aiData = aiResults[c.sourceId] ?? {};

      // No guardar listings completamente vacíos — GQL aún no los indexó, se reintentarán
      const hasAnyData = c.pageData?.title || c.description || c.priceRaw
                      || c.gql?.title || c.gql?.priceRaw;
      if (!hasAnyData) {
        process.stdout.write(`\n  ↷ ${c.sourceId}: sin datos GQL — se reintentará\n`);
        continue;
      }

      const row    = buildRow(c, aiData);
      const listingId = await upsertListing(row);

      if ((aiData.transactionType as string | undefined) === "ambos" && (aiData.salePriceCRC || aiData.salePriceUSD)) {
        const saleRow = { ...row, transaction_type: "venta",
          price_final_crc: (aiData.salePriceCRC as number|null) ?? null,
          price_final_usd: (aiData.salePriceUSD as number|null) ?? null };
        await upsertListing(saleRow);
      }

      if (listingId) enriched++;
      else errors++;
    }
  }

  console.log(`\n  ✓ Enrichment: ${enriched} guardados, ${errors} errores`);
  return { enriched, errors };
}

const toInt = (v: unknown): number | null => {
  if (v == null || v === "" || typeof v === "boolean") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

// ── PHASE 3: VERIFICATION ─────────────────────────────────────
async function phaseVerification(page: RawPage): Promise<{ verified: number; inactive: number }> {
  console.log("\n── FASE 3: Verification ─────────────────────────────");

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, source_id, price_final_crc, price_final_usd")
    .eq("is_active", true)
    .order("last_verified_at", { ascending: true, nullsFirst: true })
    .limit(VERIFY_CAP);

  if (error || !listings?.length) {
    console.log("  No hay listings para verificar");
    return { verified: 0, inactive: 0 };
  }

  console.log(`  ${listings.length} listings a verificar`);
  let verified = 0; let inactive = 0; let verifyErrors = 0;

  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    process.stdout.write(`\r  [${i+1}/${listings.length}] ${l.source_id}   `);

    try {
      const url = `https://www.facebook.com/marketplace/item/${l.source_id}/`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 } as Record<string,unknown>);
      await page.waitForTimeout(2_000);

      // Detect unavailable listings (no 3-miss delay — inactivate immediately)
      const currentUrl = page.url();
      const bodyText   = await page.evaluate(() => document.body?.textContent ?? "") as string;
      const isUnavailable =
        currentUrl.includes("404") ||
        currentUrl.includes("removed") ||
        bodyText.includes("isn't available anymore") ||
        bodyText.includes("no longer available") ||
        bodyText.includes("This content isn't available") ||
        bodyText.includes("Page Not Found");

      // Also detect if seller manually marked as Rented/Sold/Pending/Reserved
      const listingStatusText = await page.evaluate(() => {
        const STATES = ["Rented","Sold","Pending","Reserved","Alquilado","Vendido","Pendiente","Reservado"];
        const xp   = "//div[@role='main']//h1/parent::*/span[@dir='auto']";
        const snap = document.evaluate(xp, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < snap.snapshotLength; i++) {
          const t = (snap.snapshotItem(i) as HTMLElement).innerText?.trim() ?? "";
          if (STATES.includes(t)) return t;
        }
        return null;
      }) as string | null;
      const isRented = /rent(ed|ado)|sold|vendid[ao]|alquilad[ao]|pending|pendiente|reserved|reservad[ao]/i.test(listingStatusText ?? "");

      if (isUnavailable || isRented) {
        await supabase.from("listings").update({
          is_active:            false,
          is_published:         false,
          listing_status:       isRented ? listingStatusText : "UNAVAILABLE",
          inactive_detected_at: new Date().toISOString(),
          last_verified_at:     new Date().toISOString(),
        }).eq("id", l.id);
        inactive++;
      } else {
        await supabase.from("listings").update({
          is_active:        true,
          last_seen_at:     new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
        }).eq("id", l.id);
        verified++;
      }
    } catch {
      verifyErrors++;
    }

    const delay = VERIFY_DELAY_MIN + Math.random() * (VERIFY_DELAY_MAX - VERIFY_DELAY_MIN);
    await page.waitForTimeout(delay);
  }

  console.log(`\n  ✓ Verificación: ${verified} activos, ${inactive} inactivados, ${verifyErrors} errores`);
  return { verified, inactive };
}


// ── Email resumen ─────────────────────────────────────────────
async function sendSummaryEmail(stats: Record<string, number>, runId: string): Promise<void> {
  const email    = process.env.NOTIFY_EMAIL;
  const user     = process.env.GMAIL_USER ?? email;
  const password = process.env.GMAIL_APP_PASSWORD;
  if (!email || !password || password === "your-16-char-app-password-here") return;

  try {
    const t = nodemailer.createTransport({ service: "gmail", auth: { user, pass: password } });
    await t.sendMail({
      from: `"CR Market Scraper" <${user}>`,
      to:   email,
      subject: `✅ CR Market Scraper — ${MODE} corrida ${new Date().toLocaleDateString("es-CR")}`,
      html: `
        <h2>CR Market Scraper — Resumen</h2>
        <table><tbody>
          <tr><td>Modo</td><td><b>${MODE}</b></td></tr>
          <tr><td>Nuevos listings</td><td><b>${stats.enriched ?? 0}</b></td></tr>
          <tr><td>Verificados</td><td><b>${stats.verified ?? 0}</b></td></tr>
          <tr><td>Inactivados</td><td><b>${stats.inactive ?? 0}</b></td></tr>
          <tr><td>Errores</td><td>${stats.errors ?? 0}</td></tr>
        </tbody></table>
        <p style="color:gray;font-size:12px">Run ID: ${runId} — ${new Date().toLocaleString("es-CR")}</p>
      `,
    });
    console.log(`\n  📧 Resumen enviado a ${email}`);
  } catch (err) {
    console.warn("  Email no enviado:", (err as Error).message);
  }
}

// ── PHASE AI-ONLY: re-run AI on existing descriptions ─────────
async function phaseAiOnly(): Promise<{ enriched: number; errors: number }> {
  console.log("\n── AI-ONLY: extracción AI sobre descripciones existentes ──────");

  const { data: listings, error } = await supabase
    .from("listings")
    .select("id, source_id, title, description")
    .not("description", "is", null)
    .order("created_at", { ascending: true });

  if (error || !listings?.length) {
    console.log("  No hay listings con descripción");
    return { enriched: 0, errors: 0 };
  }

  let toProcess = listings.filter(l => l.description);
  if (IDS_FILTER) toProcess = toProcess.filter(l => IDS_FILTER.has(l.source_id));
  console.log(`  ${toProcess.length} listings a procesar`);

  let enriched = 0;
  let errors   = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const listing = toProcess[i];
    process.stdout.write(`\r  [${i+1}/${toProcess.length}] ${listing.source_id}   `);

    let aiData: Record<string, unknown> = {};
    try {
      const results = await aiExtractBatch([{ id: listing.source_id, title: listing.title ?? "", description: listing.description }]);
      aiData = results[listing.source_id] ?? {};
    } catch { errors++; continue; }

    if (!Object.keys(aiData).length) { errors++; continue; }

    const payload: Record<string, unknown> = {
      property_type_ai:   (aiData.propertyTypeAI   as string|null)   ?? null,
      bedrooms_ai:        toInt(aiData.bedroomsAI),
      bathrooms_ai:       toInt(aiData.bathroomsAI),
      price_ai_crc:       toInt(aiData.rentPriceCRC),
      price_ai_usd:       toInt(aiData.rentPriceUSD),
      square_meters:      toInt(aiData.squareMeters),
      parking:            toInt(aiData.parking),
      floor:              toInt(aiData.floor),
      furnished:          (aiData.furnished         as string|null)   ?? null,
      pets_allowed:       typeof aiData.petsAllowed === "boolean" ? aiData.petsAllowed : null,
      utilities_included: Array.isArray(aiData.utilitiesIncluded) ? aiData.utilitiesIncluded : [],
      amenities:          Array.isArray(aiData.amenities) ? aiData.amenities : [],
      deposit_crc:        toInt(aiData.depositCRC),
      contact_phone:      (aiData.contactPhone      as string|null)   ?? null,
      condominio_name:    (aiData.condominioName    as string|null)   ?? null,
      max_people:         toInt(aiData.maxPeople),
      availability:       (aiData.availability      as string|null)   ?? null,
      restrictions:       Array.isArray(aiData.restrictions) ? aiData.restrictions : [],
    };

    const { error: updateErr } = await supabase.from("listings").update(payload).eq("id", listing.id);
    if (updateErr) { console.log(`\n  ✗ DB error: ${updateErr.message}`); errors++; }
    else enriched++;
  }

  console.log(`\n  ✓ AI-only: ${enriched} actualizados, ${errors} errores`);
  return { enriched, errors };
}

// ── PHASE RE-ENRICH: re-fetch GQL + AI for all active listings ─
async function phaseReEnrich(
  page: RawPage,
  tokens: GqlTokens | null,
): Promise<{ enriched: number; errors: number }> {
  console.log("\n── RE-ENRICH: recolección completa de listings activos ──────");

  const { data: rows, error } = await supabase
    .from("listings")
    .select("source_id")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !rows?.length) {
    console.log("  No hay listings activos en DB");
    return { enriched: 0, errors: 0 };
  }

  const ids = rows.map((r: { source_id: string }) => r.source_id);
  console.log(`  ${ids.length} listings activos a re-enriquecer`);

  const gqlAcc: GqlAcc = new Map();
  return phaseEnrichment(page, gqlAcc, ids, tokens);
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  // --ai-only: no Chrome needed, run AI directly on DB descriptions
  if (AI_ONLY) {
    console.log("\n=== AI-ONLY mode ===");
    const r = await phaseAiOnly();
    console.log(`\n✅ Listo — ${r.enriched} actualizados, ${r.errors} errores`);
    return;
  }

  const storageState = loadStorageState();
  if (!storageState) { console.error("❌ No se encontró sesión de Facebook. Exportá las cookies con Cookie-Editor."); process.exit(1); }
  const daysLeft = checkCookieExpiry(storageState);

  // Fetch a seed listing ID for token capture (listing pages make GQL requests)
  const { data: seedRow } = await supabase.from("listings").select("source_id").not("source_id", "is", null).limit(1).single();
  const tokenSeedId = seedRow?.source_id ?? null;

  // Register run start in DB
  const { data: runRow } = await supabase.from("scraper_runs").insert({
    run_type: MODE === "bulk" ? "bulk" : MODE === "daily" ? "daily" : "manual",
    status:   "running",
    cities_scraped: GAM_CITIES.map(c => c.name),
  }).select("id").single();
  const runId = runRow?.id ?? "unknown";

  const browser    = await chromium.launch({ headless: true, args: ["--disk-cache-size=52428800"] });
  const browserCtx = await browser.newContext({ storageState: storageState as unknown as Parameters<typeof browser.newContext>[0] & { storageState: unknown } extends { storageState: infer S } ? S : never });
  const pwPage     = await browserCtx.newPage();
  const page       = pwPage as unknown as RawPage;
  const stats      = { enriched: 0, verified: 0, inactive: 0, errors: 0 };

  try {
    console.log("\nAbriendo Chrome...");

    // ── GQL interception + token capture ──────────────────────
    // Registrar ANTES del goto: la página hace requests GQL al cargar,
    // capturamos los tokens del body de esas requests (más confiable que window.require)
    const gqlAcc: GqlAcc = new Map();
    let currentCity = "";
    let gqlTokens: GqlTokens | null = null;

    try {
      await browserCtx.route("**/api/graphql/", async (route) => {
        // Capturar tokens del body de la primera request GQL
        if (!gqlTokens) {
          const postBody = route.request().postData() ?? "";
          const params   = new URLSearchParams(postBody);
          const dtsg     = params.get("fb_dtsg");
          const lsdVal   = params.get("lsd");
          if (dtsg && lsdVal) {
            const freshCookies = await browserCtx.cookies(["https://www.facebook.com"]);
            gqlTokens = {
              fb_dtsg:   dtsg,
              lsd:       lsdVal,
              rev:       params.get("__rev") ?? "1037953373",
              userId:    params.get("av") ?? params.get("__user") ?? "0",
              cookieStr: freshCookies.map(c => `${c.name}=${c.value}`).join("; "),
            };
            console.log(`✓ Tokens GQL capturados de request (fb_dtsg: ${dtsg.slice(0, 10)}...)`);
          }
        }
        // Procesar response para discovery
        try {
          const res  = await route.fetch();
          const text = await res.text();
          for (const line of text.split("\n")) {
            if (line.trim().startsWith("{")) {
              try { traverseGQL(JSON.parse(line.trim()), gqlAcc, currentCity); } catch { /* ok */ }
            }
          }
          await route.fulfill({ response: res });
        } catch { await route.continue(); }
      });
      console.log("✓ Interceptor GQL activo");
    } catch (err) { console.warn(`  ⚠ GQL interceptor: ${String(err).slice(0, 60)}`); }

    // Navegar a marketplace (página pública — confirma conectividad y warmup de sesión)
    await pwPage.goto("https://www.facebook.com/marketplace/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await pwPage.waitForTimeout(1_500);

    // Verificar sesión: c_user en cookies = logueado
    const cUser = await pwPage.evaluate(() => document.cookie.match(/c_user=(\d+)/)?.[1] ?? null);
    if (!cUser) {
      console.error("❌ Sesión inválida — las cookies no autentican. Re-exportá desde Cookie-Editor en facebook.com.");
      console.error("   1. Abrí Chrome/Firefox con tu sesión activa en facebook.com");
      console.error("   2. Cookie-Editor → Export → Export as JSON → guardá en fb-session.json");
      console.error("   3. Borrá fb-playwright-session.json y volvé a correr");
      throw new Error("Sesión inválida");
    }
    console.log(`✓ Sesión activa (c_user: ${cUser})`);

    // Navegar a una listing page: estas sí hacen requests GQL → captura tokens
    if (!gqlTokens && tokenSeedId) {
      await pwPage.goto(`https://www.facebook.com/marketplace/item/${tokenSeedId}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await pwPage.waitForTimeout(3_000); // esperar requests GQL de la PDP
    }

    if (!gqlTokens) {
      console.warn("  ⚠ No se capturaron tokens GQL — enrichment usará scraping DOM");
    }

    // ── Load known IDs from DB ─────────────────────────────────
    const { data: existingRows } = await supabase.from("listings").select("source_id");
    const knownIds = new Set((existingRows ?? []).map((r: { source_id: string }) => r.source_id));
    console.log(`\n✓ ${knownIds.size} listings ya en DB`);

    // ── Run phases ────────────────────────────────────────────
    if (AI_ONLY) {
      const r = await phaseAiOnly();
      stats.enriched = r.enriched;
      stats.errors   = r.errors;

    } else if (MODE === "verify-only") {
      const r = await phaseVerification(page);
      stats.verified = r.verified;
      stats.inactive = r.inactive;

    } else if (MODE === "re-enrich") {
      const r = await phaseReEnrich(page, gqlTokens);
      stats.enriched = r.enriched;
      stats.errors   = r.errors;

    } else if (DISCOVERY_ONLY) {
      const newIds = await phaseDiscovery(page, gqlAcc, knownIds);
      console.log(`\n── Resultado discovery (sin guardar) ────────────────`);
      console.log(`  Total nuevos: ${newIds.length}`);
      newIds.forEach((id, i) => console.log(`  [${i+1}] ${id}`));
      stats.enriched = newIds.length;

    } else {
      // daily or bulk: Discovery → Enrichment → Verification
      const newIds = await phaseDiscovery(page, gqlAcc, knownIds);

      if (newIds.length > 0) {
        const er = await phaseEnrichment(page, gqlAcc, newIds, gqlTokens);
        stats.enriched = er.enriched;
        stats.errors  += er.errors;
      } else {
        console.log("\n  No hay listings nuevos para enriquecer.");
      }

      if (MODE === "bulk" && VERIFY_CAP > 0) {
        const vr = await phaseVerification(page);
        stats.verified = vr.verified;
        stats.inactive = vr.inactive;
      }
    }

    // ── Update run record ──────────────────────────────────────
    const { count: totalInDB } = await supabase.from("listings").select("*", { count: "exact", head: true }).eq("is_active", true);
    await supabase.from("scraper_runs").update({
      status:               "completed",
      finished_at:          new Date().toISOString(),
      new_listings:         stats.enriched,
      verified_count:       stats.verified,
      inactive_detected:    stats.inactive,
      errors_count:         stats.errors,
      total_listings_in_db: totalInDB ?? 0,
    }).eq("id", runId);

    console.log(`\n${"=".repeat(50)}`);
    console.log(`✅ CORRIDA COMPLETA — modo: ${DISCOVERY_ONLY ? "discovery-only" : MODE}`);
    console.log(`   ${DISCOVERY_ONLY ? "Descubiertos" : "Nuevos"}:       ${stats.enriched}`);
    if (!DISCOVERY_ONLY) console.log(`   Verificados:     ${stats.verified}`);
    if (!DISCOVERY_ONLY) console.log(`   Inactivados:     ${stats.inactive}`);
    console.log(`   Total en DB:     ${totalInDB}`);
    console.log(`${"=".repeat(50)}\n`);

    // Cookie expiry warning in email
    if (daysLeft <= 30) stats.errors++;
    await sendSummaryEmail(stats, runId);

  } catch (err) {
    console.error("ERROR FATAL:", err);
    await supabase.from("scraper_runs").update({ status: "failed", finished_at: new Date().toISOString(), notes: String(err).slice(0, 500) }).eq("id", runId);
  } finally {
    await browser.close();
  }
}

main();
