-- Loyalty — rol de base con permisos mínimos.
--
-- Correr DESPUÉS de db/migrations/012_loyalty_fundaciones.sql, con el rol
-- dueño del esquema (el mismo usuario admin que corre el resto de las
-- migraciones). Se corre UNA SOLA VEZ — volver a correrlo es seguro
-- (CREATE ROLE está protegido con el DO $$ de abajo, los GRANT/REVOKE son
-- siempre idempotentes).
--
-- Por qué existe este archivo separado, en vez de un GRANT suelto en
-- 012: el ledger append-only (loyalty.movimientos) y los consentimientos
-- (loyalty.consentimientos) dejan de ser inmutables "por convención" del
-- código y pasan a ser inmutables "por permiso" — ni un bug en la
-- aplicación puede reescribirlos. Ver
-- docs/LOYALTY-ARQUITECTURA-Y-SEGURIDAD.md §4.
--
-- Después de correr esto: armar la connection string de app_loyalty con
-- la contraseña generada y cargarla en LOYALTY_DATABASE_URL (Vercel, como
-- variable *sensitive* — ver .env.example).
--
-- Correr a mano en el SQL Editor de Neon:
--   psql "<DATABASE_URL>" -f db/migrations/013_loyalty_rol.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_loyalty') THEN
    -- Reemplazar '<generar>' por una contraseña larga generada una sola
    -- vez (ej. `openssl rand -base64 32`) ANTES de correr este archivo.
    CREATE ROLE app_loyalty LOGIN PASSWORD '<generar>';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA loyalty TO app_loyalty;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA loyalty TO app_loyalty;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA loyalty TO app_loyalty;

-- Para que las tablas que se creen MÁS ADELANTE en este esquema también
-- queden con estos permisos por defecto, sin tener que repetir este
-- archivo en cada migración nueva de Loyalty.
ALTER DEFAULT PRIVILEGES IN SCHEMA loyalty
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_loyalty;
ALTER DEFAULT PRIVILEGES IN SCHEMA loyalty
  GRANT USAGE ON SEQUENCES TO app_loyalty;

-- El ledger y los consentimientos son inmutables. Ni la app puede
-- reescribir historia — si un cambio de código intenta un UPDATE o un
-- DELETE sobre estas dos tablas, el error es la señal de que el código
-- está mal, no el permiso.
REVOKE UPDATE, DELETE ON loyalty.movimientos FROM app_loyalty;
REVOKE UPDATE, DELETE ON loyalty.consentimientos FROM app_loyalty;

-- Lectura mínima del núcleo: solo las columnas que el router del tap y el
-- alta de Loyalty necesitan de la tabla `comercios`. app_loyalty no debe
-- poder leer ni tocar nada más de Reviews (reseñas, taps, auditoría,
-- clientes del panel, etc.).
GRANT USAGE ON SCHEMA public TO app_loyalty;
GRANT SELECT (id, nombre, tiene_loyalty, comercio_padre_id) ON public.comercios TO app_loyalty;
