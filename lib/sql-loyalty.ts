import "server-only";
import postgres from "postgres";

// Cliente Postgres del esquema `loyalty` — separado de lib/sql.ts a
// propósito. Usa LOYALTY_DATABASE_URL, la connection string del rol
// app_loyalty (permisos mínimos, ver db/migrations/013_loyalty_rol.sql):
// ese rol no puede leer reseñas, taps, ni ninguna tabla de Reviews más
// allá de las columnas puntuales de `comercios` que necesita, y no puede
// ni actualizar ni borrar el ledger de puntos. Reusar `sql` de lib/sql.ts
// (rol admin, acceso total) para Loyalty anularía esa separación.
//
// LOYALTY_DATABASE_URL: postgres://app_loyalty:password@host:5432/basededatos
// En Neon agregá "?sslmode=require" al final de la URL.

const connectionString = process.env.LOYALTY_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta la variable de entorno LOYALTY_DATABASE_URL. Ver .env.example y " +
      "db/migrations/013_loyalty_rol.sql para crear el rol app_loyalty.",
  );
}

if (connectionString.includes("neon.tech") && !connectionString.includes("-pooler")) {
  console.warn(
    "LOYALTY_DATABASE_URL apunta a Neon SIN pooler (falta '-pooler' en el host). " +
      "En producción serverless usá la connection string 'Pooled' de Neon.",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __taplySqlLoyalty: ReturnType<typeof postgres> | undefined;
}

// En dev, Next.js recarga módulos en cada cambio de archivo: reusar la
// conexión global evita abrir cientos de conexiones nuevas.
export const sqlLoyalty =
  globalThis.__taplySqlLoyalty ??
  postgres(connectionString, {
    ssl: connectionString.includes("neon.tech") ? "require" : undefined,
    max: 2,
    idle_timeout: 20,
    connect_timeout: 10,
    // Mismo motivo que lib/sql.ts: Neon en modo pooler (PgBouncer) no
    // lleva bien los prepared statements con nombre.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__taplySqlLoyalty = sqlLoyalty;
}
