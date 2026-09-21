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
//
// CONEXIONES
//   Depende de:  LOYALTY_DATABASE_URL (env var, obligatoria)
//   Se conecta a: esquema `loyalty` en Neon, como el rol `app_loyalty`
//                 (creado por db/migrations/013_loyalty_rol.sql)
//   Lo usa:       lib/db/loyalty.ts — es el ÚNICO archivo que importa
//                 `sqlLoyalty` directamente. Nada más en el repo debería
//                 hacerlo (si necesitás una query nueva, agregala como
//                 función en lib/db/loyalty.ts, no importes esto desde
//                 un componente o una action).
//   La conexión se crea en el PRIMER USO, no al importar. Si falta
//   LOYALTY_DATABASE_URL el error salta recién cuando alguien consulta
//   Loyalty — nunca durante el build. Antes tiraba al importar el módulo,
//   y un ambiente sin la variable (un Preview, un entorno nuevo) rompía el
//   build ENTERO de la app, incluido todo Reviews, que no depende de esto.

type ClienteLoyalty = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __taplySqlLoyalty: ClienteLoyalty | undefined;
}

function crearCliente(): ClienteLoyalty {
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

  return postgres(connectionString, {
    ssl: connectionString.includes("neon.tech") ? "require" : undefined,
    max: 2,
    idle_timeout: 20,
    connect_timeout: 10,
    // Mismo motivo que lib/sql.ts: Neon en modo pooler (PgBouncer) no
    // lleva bien los prepared statements con nombre.
    prepare: false,
  });
}

let instancia: ClienteLoyalty | undefined;

function cliente(): ClienteLoyalty {
  // En dev, Next.js recarga módulos en cada cambio de archivo: reusar la
  // conexión global evita abrir cientos de conexiones nuevas.
  instancia ??= globalThis.__taplySqlLoyalty ?? crearCliente();
  if (process.env.NODE_ENV !== "production") globalThis.__taplySqlLoyalty = instancia;
  return instancia;
}

// Se usa igual que el cliente de postgres (sqlLoyalty`...`, .begin, .json),
// pero delega en `cliente()` recién al primer uso.
export const sqlLoyalty: ClienteLoyalty = new Proxy((() => undefined) as unknown as ClienteLoyalty, {
  apply: (_objetivo, _this, args: unknown[]) => Reflect.apply(cliente() as unknown as (...a: unknown[]) => unknown, undefined, args),
  get: (_objetivo, propiedad) => Reflect.get(cliente(), propiedad),
});
