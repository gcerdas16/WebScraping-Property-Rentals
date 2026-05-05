import pg from "pg";

const ref  = "qsfljguabouwqhfsagoa";
const pass = "fYAwULxTxGcLe0OJ";

const tests = [
  { label: "Direct IPv4 db host",     cs: `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres` },
  { label: "Pooler us-east-1 :5432",  cs: `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:5432/postgres` },
  { label: "Pooler us-east-1 :6543",  cs: `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres` },
  { label: "Pooler sa-east-1 :5432",  cs: `postgresql://postgres.${ref}:${pass}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres` },
];

for (const { label, cs } of tests) {
  const c = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  try {
    await c.connect();
    const r = await c.query("SELECT version()");
    await c.end();
    console.log(`✅ ${label}: ${r.rows[0].version.slice(0, 35)}`);
  } catch (e) {
    console.log(`✗  ${label}: ${e.message.slice(0, 60)}`);
  }
}
