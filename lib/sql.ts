import "server-only";
import postgres from "postgres";

// Cliente Postgres puro (sin ORM) — mismo driver funciona en local y en
// Neon (producción). Una sola conexión reusada entre requests (Next.js
// mantiene el módulo en memoria entre invocaciones de la misma instancia).
//
// DATABASE_URL: postgres://usuario:password@host:5432/basededatos
// En Neon agregá "?sslmode=require" al final de la URL.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta la variable de entorno DATABASE_URL. Ver README para crear la base de datos gratis en neon.tech.",
  );
}

// En serverless cada instancia abre su propio pool: la URL debe ser la del
// pooler de Neon (host con "-pooler"), no la conexión directa — con la
// directa un pico de tráfico agota las conexiones reales de la base.
if (connectionString.includes("neon.tech") && !connectionString.includes("-pooler")) {
  console.warn(
    "DATABASE_URL apunta a Neon SIN pooler (falta '-pooler' en el host). " +
      "En producción serverless usá la connection string 'Pooled' de Neon.",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __taplySql: ReturnType<typeof postgres> | undefined;
}

// En dev, Next.js recarga módulos en cada cambio de archivo: reusar la
// conexión global evita abrir cientos de conexiones nuevas.
export const sql =
  globalThis.__taplySql ??
  postgres(connectionString, {
    ssl: connectionString.includes("neon.tech") ? "require" : undefined,
    // Por instancia serverless: 2 alcanza (cada request usa 1-2 consultas a
    // la vez) y evita que un pico de instancias acumule conexiones ociosas
    // contra el pooler. Las ociosas se devuelven a los 20s; connect_timeout
    // corta rápido si Neon está despertando en un cold start.
    max: 2,
    idle_timeout: 20,
    connect_timeout: 10,
    // Neon en modo pooler (PgBouncer) no lleva bien los prepared statements
    // con nombre: cada ALTER TABLE puede dejar conexiones con un plan de
    // consulta cacheado y desactualizado ("cached plan must not change
    // result type"). Server-side prepare desactivado evita ese problema.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__taplySql = sql;
}
