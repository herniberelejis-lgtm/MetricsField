-- Migración 011: login con Google para el portal de cada cliente.
--
-- Contexto: hasta ahora el código de acceso (codigo_acceso) era la única
-- credencial del portal — cualquiera con el link entraba. Esta tabla es la
-- allowlist de cuentas de Google admitidas a entrar al portal DE UN
-- COMERCIO PUNTUAL (a diferencia de `admins`, que es la allowlist del
-- equipo para /admin). Siempre contra la cuenta raíz — igual que
-- codigo_acceso, una sucursal nunca tiene su propia fila acá.
--
-- Un comercio sin ningún email cargado sigue abriendo su portal solo con el
-- código, como siempre: el login con Google recién se exige cuando se carga
-- el primer email (ver lib/portal-auth.ts). No rompe a ningún cliente activo
-- hasta que un admin decida sumarle un email desde su ficha.
--
-- Correr a mano en el SQL Editor de Neon:
--   psql "<DATABASE_URL>" -f db/migrations/011_portal_usuarios.sql
-- Idempotente.

CREATE TABLE IF NOT EXISTS portal_usuarios (
  comercio_id  TEXT NOT NULL REFERENCES comercios(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  nombre       TEXT NOT NULL DEFAULT '',
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comercio_id, email)
);
