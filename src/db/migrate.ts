import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon } from "@neondatabase/serverless";

const sql = neon(String(process.env.DATABASE_URL));

const db = drizzle(sql);

(async function main() {
  await migrate(db, { migrationsFolder: "src/db/migrations" });

  console.info("Finished migrating database.");
})();
