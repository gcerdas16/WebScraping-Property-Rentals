import "dotenv/config";
import pg from "pg";
const { Client } = pg;

const client = new Client({
  host:     process.env.SUPABASE_DB_HOST,
  user:     process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl:      { rejectUnauthorized: false },
  port:     6543,
});

async function main() {
  await client.connect();

  // Find dependent objects
  const deps = await client.query(`
    SELECT DISTINCT dependent_ns.nspname AS schema, dependent_view.relname AS name, dependent_view.relkind
    FROM pg_depend
    JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
    JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid
    JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid
    JOIN pg_attribute ON pg_depend.refobjid = pg_attribute.attrelid
      AND pg_depend.refobjsubid = pg_attribute.attnum
    JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
    WHERE pg_attribute.attname IN ('bedrooms', 'bathrooms')
      AND source_table.relname = 'listings'
  `);

  if (deps.rows.length) {
    console.log("Objetos que dependen de bedrooms/bathrooms:");
    deps.rows.forEach(r => console.log(`  ${r.schema}.${r.name} (relkind=${r.relkind})`));
  } else {
    console.log("(no se encontraron dependencias via pg_depend/views)");
  }

  // Try CASCADE
  try {
    await client.query("ALTER TABLE listings DROP COLUMN IF EXISTS image_url_fb CASCADE, DROP COLUMN IF EXISTS image_url CASCADE");
    console.log("✓ Columnas image_url_fb e image_url eliminadas (CASCADE)");
  } catch (e: unknown) {
    console.error("❌", (e as Error).message);
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
