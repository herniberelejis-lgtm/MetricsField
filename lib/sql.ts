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
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__taplySql = sql;
}
