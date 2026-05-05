/**
 * export-for-railway.ts
 * ─────────────────────
 * Convierte el export de Cookie-Editor (fb-session.json) al valor
 * que hay que pegar en Railway como variable FB_SESSION_COOKIES.
 *
 * Uso:
 *   npx tsx scripts/export-for-railway.ts
 *
 * Luego copiá el valor impreso y pegalo en:
 *   Railway dashboard → tu proyecto → Variables → FB_SESSION_COOKIES
 */

import fs from "fs";
import path from "path";

const SESSION_FILE = path.resolve("fb-session.json");

if (!fs.existsSync(SESSION_FILE)) {
  console.error("❌ No se encontró fb-session.json en la carpeta del proyecto.");
  console.error("   Exportá las cookies de Cookie-Editor primero.");
  process.exit(1);
}

const raw = fs.readFileSync(SESSION_FILE, "utf-8");

// Validate it's valid JSON
try {
  JSON.parse(raw);
} catch {
  console.error("❌ fb-session.json no es un JSON válido.");
  process.exit(1);
}

// Minify to a single line (easy to paste in Railway)
const minified = JSON.stringify(JSON.parse(raw));

console.log("\n✅ Copiá este valor y pegalo en Railway como FB_SESSION_COOKIES:\n");
console.log("─".repeat(60));
console.log(minified);
console.log("─".repeat(60));
console.log("\nPasos:");
console.log("1. Copiá la línea de arriba (todo el JSON)");
console.log("2. Abrí railway.app/dashboard → tu proyecto → Variables");
console.log("3. Buscá FB_SESSION_COOKIES (o creá esa variable)");
console.log("4. Pegá el valor → Save");
console.log("5. Railway se redespliega automáticamente\n");
