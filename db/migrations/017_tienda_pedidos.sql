-- Tienda propia de hardware (standee, tarjeta, sticker, pack) con cobro por
-- Mercado Pago Checkout Pro. Correr a mano en el SQL Editor de Neon: no se
-- aplica solo.
--
-- El total se guarda en centavos y se calcula SIEMPRE en el servidor con el
-- catálogo de lib/tienda/catalogo.ts: nunca se confía en el precio que manda
-- el navegador. El token del pedido es la única credencial para ver su
-- estado (/pedido/<token>), así que es largo y aleatorio.

CREATE TABLE IF NOT EXISTS pedidos (
  id              BIGSERIAL PRIMARY KEY,
  token           TEXT NOT NULL UNIQUE,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'pagado', 'rechazado', 'cancelado', 'enviado', 'entregado')),
  nombre          TEXT NOT NULL,
  email           TEXT NOT NULL,
  whatsapp        TEXT NOT NULL,
  cuit            TEXT,
  entrega         TEXT NOT NULL CHECK (entrega IN ('instalacion_cordoba', 'envio_nacional')),
  direccion       TEXT,
  localidad       TEXT,
  provincia       TEXT,
  codigo_postal   TEXT,
  subtotal_centavos BIGINT NOT NULL CHECK (subtotal_centavos >= 0),
  iva_centavos    BIGINT NOT NULL CHECK (iva_centavos >= 0),
  envio_centavos  BIGINT,            -- NULL = envío a coordinar, no incluido en el pago
  total_centavos  BIGINT NOT NULL CHECK (total_centavos >= 0),
  mp_preferencia_id TEXT,
  mp_pago_id      TEXT,
  origen          TEXT,              -- sección de la web desde la que llegó
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id              BIGSERIAL PRIMARY KEY,
  pedido_id       BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto        TEXT NOT NULL,     -- slug del catálogo
  nombre          TEXT NOT NULL,     -- copia del nombre al momento de comprar
  cantidad        INTEGER NOT NULL CHECK (cantidad BETWEEN 1 AND 50),
  precio_unitario_centavos BIGINT NOT NULL CHECK (precio_unitario_centavos >= 0)
);

CREATE INDEX IF NOT EXISTS pedidos_estado_idx ON pedidos (estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS pedido_items_pedido_idx ON pedido_items (pedido_id);
