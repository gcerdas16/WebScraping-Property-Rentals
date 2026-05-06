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
  await client.query("ALTER DATABASE postgres SET timezone = 'America/Costa_Rica'");
  console.log("✓ Timezone seteado a America/Costa_Rica");
  await client.end();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
