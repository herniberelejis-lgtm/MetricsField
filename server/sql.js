const postgres = require("postgres");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta DATABASE_URL. Copiá .env.example a .env.local y completá la URL de Neon.",
  );
}

const sql = postgres(connectionString, {
  ssl: connectionString.includes("neon.tech") ? "require" : undefined,
  max: 2,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

module.exports = { sql };
