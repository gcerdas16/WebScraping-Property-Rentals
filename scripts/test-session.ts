/**
 * test-session.ts — diagnóstico rápido de sesión y tokens
 */
import { chromium } from "patchright-core";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function main() {
  const PW_FILE  = path.resolve("fb-playwright-session.json");
  const RAW_FILE = path.resolve("fb-session.json");
  const sessionPath = fs.existsSync(PW_FILE) ? PW_FILE : RAW_FILE;
  const toSS = (s: string | null) =>
    s === "no_restriction" ? "None" : s === "lax" ? "Lax" : s === "strict" ? "Strict" : "Lax";
  const rawData = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
  const storageState = Array.isArray(rawData)
    ? {
        cookies: (rawData as Array<Record<string,unknown>>)
          .filter(c => String(c.domain).includes("facebook"))
          .map(c => ({
            name:     String(c.name),
            value:    String(c.value),
            domain:   String(c.domain).startsWith(".") ? String(c.domain) : `.${c.domain}`,
            path:     String(c.path ?? "/"),
            expires:  Math.floor(Number(c.expirationDate ?? c.expires ?? -1)),
            httpOnly: Boolean(c.httpOnly ?? false),
            secure:   Boolean(c.secure ?? true),
            sameSite: toSS(c.sameSite as string | null) as "Strict"|"Lax"|"None",
          })),
        origins: [],
      }
    : rawData as { cookies: unknown[]; origins: unknown[] };
  console.log(`✓ ${storageState.cookies.length} cookies cargadas desde ${sessionPath.split(/[\\/]/).pop()}`);

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: row } = await supabase.from("listings").select("source_id").not("source_id", "is", null).limit(1).single();
  const sampleId = row?.source_id ?? "123456789";
  console.log(`✓ Listing de prueba: ${sampleId}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState });

  let capturedTokens: Record<string, string> = {};
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/graphql") || url.includes("graphql")) {
      const body   = route.request().postData() ?? "";
      const params = new URLSearchParams(body);
      const dtsg   = params.get("fb_dtsg");
      const lsd    = params.get("lsd");
      if (dtsg && lsd && !capturedTokens.fb_dtsg) {
        capturedTokens = { fb_dtsg: dtsg, lsd, rev: params.get("__rev") ?? "n/a" };
        console.log(`  ✓ Tokens capturados! fb_dtsg=${dtsg.slice(0,10)}... lsd=${lsd}`);
      }
    }
    await route.continue();
  });

  const page = await context.newPage();

  // Test 1: Facebook home (requires full auth)
  console.log("\n[Test 1] Navegando a facebook.com...");
  await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(1_000);
  console.log(`  URL:    ${page.url().slice(0, 80)}`);
  console.log(`  Título: ${(await page.title()).slice(0, 60)}`);

  // Test 2: Marketplace home
  console.log("\n[Test 2] Navegando a marketplace...");
  await page.goto("https://www.facebook.com/marketplace/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(1_500);
  console.log(`  URL:    ${page.url().slice(0, 80)}`);
  console.log(`  Título: ${(await page.title()).slice(0, 60)}`);
  const hasReq = await page.evaluate(() => typeof (window as unknown as Record<string,unknown>).require === "function");
  console.log(`  hasRequire: ${hasReq}`);

  // Test 3: Specific listing item
  console.log(`\n[Test 3] Navegando a listing item (${sampleId})...`);
  await page.goto(`https://www.facebook.com/marketplace/item/${sampleId}/`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(2_000);
  console.log(`  URL:    ${page.url().slice(0, 80)}`);
  console.log(`  Título: ${(await page.title()).slice(0, 60)}`);

  // Test 4: San José category
  console.log("\n[Test 4] Navegando a San José propertyrentals...");
  await page.goto("https://www.facebook.com/marketplace/sanjosecr/propertyrentals?sortBy=creation_time_descend&exact=false", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(1_500);
  console.log(`  URL:    ${page.url().slice(0, 100)}`);
  console.log(`  Título: ${(await page.title()).slice(0, 60)}`);

  // Test 5: Generic category (no city)
  console.log("\n[Test 5] Navegando a marketplace propertyrentals (sin ciudad)...");
  await page.goto("https://www.facebook.com/marketplace/category/propertyrentals/?sortBy=creation_time_descend", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(1_500);
  console.log(`  URL:    ${page.url().slice(0, 100)}`);
  console.log(`  Título: ${(await page.title()).slice(0, 60)}`);

  console.log(`\nTokens capturados: ${JSON.stringify(capturedTokens)}`);

  await browser.close();
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
