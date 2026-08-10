import "server-only";
import crypto from "node:crypto";
import { sql } from "../sql";
import type { Cliente, DestinoLink, LinkNFC, Rubro, Zona } from "../types";
import { ensambleCliente, limpiarUrl, mapClienteBase, mapMetrica, mapVenta, slugify } from "./_compartido";
import type { MetricaMensual, VentaNFC } from "../types";

// ---------- Lectura: clientes ----------

export async function getClientes(): Promise<Cliente[]> {
  // 3 consultas totales, sin depender de la cantidad de clientes. La
  // versión anterior (2 consultas POR cliente vía ensambleCliente) era un
  // N+1 que castigaba todas las páginas del panel que listan clientes.
  const [comercios, metricas, ventas] = await Promise.all([
    sql`SELECT * FROM comercios ORDER BY fecha_alta ASC`,
    sql`SELECT * FROM metricas_mensuales ORDER BY mes ASC`,
    sql`SELECT * FROM ventas_nfc ORDER BY fecha ASC`,
  ]);

  const metricasPor = new Map<string, MetricaMensual[]>();
  for (const r of metricas) {
    const lista = metricasPor.get(r.comercio_id as string);
    if (lista) lista.push(mapMetrica(r));
    else metricasPor.set(r.comercio_id as string, [mapMetrica(r)]);
  }
  const ventasPor = new Map<string, VentaNFC[]>();
  for (const r of ventas) {
    const lista = ventasPor.get(r.comercio_id as string);
    if (lista) lista.push(mapVenta(r));
    else ventasPor.set(r.comercio_id as string, [mapVenta(r)]);
  }

  return comercios.map((row) =>
    mapClienteBase(
      row,
      metricasPor.get(row.id as string) ?? [],
      ventasPor.get(row.id as string) ?? [],
    ),
  );
}

/** Igual que getClientes(), pero solo cuentas (sin comercio_padre_id) — para
 * cualquier pantalla que sume plata (fee/MRR) o cuente "clientes": si se
 * usara getClientes() ahí, un cliente con 3 sucursales se contaría 3 veces
 * y su fee (copiado a cada sucursal) se sumaría 3 veces. Las pantallas que
 * miran métricas por local (hardware) siguen usando getClientes() sin
 * cambios — ahí sí interesa cada local por separado. */
export async function getCuentas(): Promise<Cliente[]> {
  const todos = await getClientes();
  return todos.filter((c) => !c.comercioPadreId);
}

/** Cantidad de sucursales por cuenta, para el badge del listado. */
export async function contarSucursalesPorCuenta(): Promise<Map<string, number>> {
  const rows = await sql`
    SELECT comercio_padre_id, COUNT(*)::int AS n
    FROM comercios
    WHERE comercio_padre_id IS NOT NULL
    GROUP BY comercio_padre_id
  `;
  return new Map(rows.map((r) => [r.comercio_padre_id as string, r.n as number]));
}

export async function getCliente(id: string): Promise<Cliente | undefined> {
  const rows = await sql`SELECT * FROM comercios WHERE id = ${id}`;
  if (rows.length === 0) return undefined;
  return ensambleCliente(rows[0]);
}

export async function getClientePorCodigo(codigo: string): Promise<Cliente | undefined> {
  if (!codigo) return undefined;
  const rows = await sql`SELECT * FROM comercios WHERE codigo_acceso = ${codigo}`;
  if (rows.length === 0) return undefined;
  return ensambleCliente(rows[0]);
}

/** Lo mínimo que necesita /t/[slug] en UNA consulta: el link y, si está
 * asignado, lo poco del comercio que usa la página del tap. Nada de histórico,
 * ventas ni conteo de taps — esta es la ruta más caliente del producto
 * (cada tap de un cliente final pasa por acá). */
export interface DatosTap {
  link: Pick<
    LinkNFC,
    "id" | "destino" | "urlDestino" | "activo" | "autogestionado" | "nombreNegocio"
  >;
  comercio: { id: string; nombre: string; rubro: Rubro; googleReviewUrl: string } | null;
}

export async function getDatosTap(slug: string): Promise<DatosTap | undefined> {
  const rows = await sql`
    SELECT l.id, l.destino, l.url_destino, l.activo,
           l.autogestionado, l.nombre_negocio,
           co.id AS comercio_id, co.nombre, co.rubro, co.google_review_url
    FROM links_nfc l
    LEFT JOIN comercios co ON co.id = l.comercio_id
    WHERE l.id = ${slug}
  `;
  if (rows.length === 0) return undefined;
  const r = rows[0];
  return {
    link: {
      id: r.id as string,
      destino: r.destino as DestinoLink,
      urlDestino: (r.url_destino as string | null) ?? null,
      activo: Boolean(r.activo),
      // las columnas son NOT NULL y siempre vienen en el SELECT
      autogestionado: Boolean(r.autogestionado),
      nombreNegocio: (r.nombre_negocio as string) ?? "",
    },
    comercio: r.comercio_id
      ? {
          id: r.comercio_id as string,
          nombre: r.nombre as string,
          rubro: r.rubro as Rubro,
          googleReviewUrl: r.google_review_url as string,
        }
      : null,
  };
}

// ---------- Escritura: clientes ----------

export function generarCodigo(): string {
  // 8 bytes = 64 bits de entropía. Es la credencial permanente del portal
  // del cliente (sin expiración): 4 bytes eran un margen demasiado fino
  // contra enumeración. Solo afecta códigos nuevos o regenerados.
  return crypto.randomBytes(8).toString("hex");
}

export async function crearCliente(
  datos: Omit<
    Cliente,
    | "id"
    | "codigoAcceso"
    | "ventasNFC"
    | "historico"
    | "ratingGoogle"
    | "resenasGoogle"
    | "googleSyncEn"
    | "googleLocation"
    | "googleConectadoEn"
    | "autoResponderPositivas"
    | "autoResponderUmbral"
    | "resenasSyncEn"
    | "emailNotificaciones"
    | "comercioPadreId"
  > & { comercioPadreId?: string | null },
): Promise<Cliente> {
  let id = slugify(datos.nombre) || "comercio";
  // asegurar unicidad del id/slug
  for (let i = 0; i < 50; i++) {
    const existe = await sql`SELECT 1 FROM comercios WHERE id = ${id}`;
    if (existe.length === 0) break;
    id = `${slugify(datos.nombre)}-${crypto.randomBytes(2).toString("hex")}`;
  }
  // Toda fila necesita su propio código único (columna UNIQUE NOT NULL),
  // pero si es una sucursal (comercioPadreId presente) ese código nunca se
  // comparte con nadie: el portal se accede siempre con el código de la
  // cuenta raíz — ver resolverCuenta().
  const codigoAcceso = generarCodigo();
  const comercioPadreId = datos.comercioPadreId ?? null;
  // Transacción: el comercio y su link de mostrador por defecto nacen
  // juntos o no nace ninguno — sin esto, un fallo en el segundo INSERT
  // dejaba un comercio sin link, estado que la UI asume imposible.
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO comercios (id, codigo_acceso, nombre, rubro, zona, plan, estado, contacto, google_review_url, busqueda_clave, fee, tono_marca, fecha_alta, google_place_id, comercio_padre_id)
      VALUES (${id}, ${codigoAcceso}, ${datos.nombre}, ${datos.rubro}, ${datos.zona}, ${datos.plan}, ${datos.estado}, ${datos.contacto}, ${limpiarUrl(datos.googleReviewUrl)}, ${datos.busquedaClave}, ${datos.fee}, ${datos.tonoMarca ?? "cercano"}, ${datos.fechaAlta}, ${datos.googlePlaceId ?? ""}, ${comercioPadreId})
    `;
    // link de mostrador por defecto, para que el gestor de links no arranque vacío
    await tx`
      INSERT INTO links_nfc (id, comercio_id, etiqueta, destino)
      VALUES (${`${id}-mostrador`}, ${id}, ${"Mostrador"}, ${"resena"})
    `;
  });
  const c = await getCliente(id);
  if (!c) throw new Error("No se pudo crear el comercio.");
  return c;
}

/** Sucursales (locales físicos) que cuelgan de una cuenta, en el mismo
 * formato que getClientes — 3 consultas totales, no N+1. Vacío si `cuentaId`
 * no tiene sucursales (el caso de la inmensa mayoría de los clientes). */
export async function getSucursales(cuentaId: string): Promise<Cliente[]> {
  const [comercios, metricas, ventas] = await Promise.all([
    sql`SELECT * FROM comercios WHERE comercio_padre_id = ${cuentaId} ORDER BY fecha_alta ASC`,
    sql`SELECT m.* FROM metricas_mensuales m JOIN comercios c ON c.id = m.comercio_id WHERE c.comercio_padre_id = ${cuentaId} ORDER BY m.mes ASC`,
    sql`SELECT v.* FROM ventas_nfc v JOIN comercios c ON c.id = v.comercio_id WHERE c.comercio_padre_id = ${cuentaId} ORDER BY v.fecha ASC`,
  ]);
  const metricasPor = new Map<string, MetricaMensual[]>();
  for (const r of metricas) {
    const lista = metricasPor.get(r.comercio_id as string);
    if (lista) lista.push(mapMetrica(r));
    else metricasPor.set(r.comercio_id as string, [mapMetrica(r)]);
  }
  const ventasPor = new Map<string, VentaNFC[]>();
  for (const r of ventas) {
    const lista = ventasPor.get(r.comercio_id as string);
    if (lista) lista.push(mapVenta(r));
    else ventasPor.set(r.comercio_id as string, [mapVenta(r)]);
  }
  return comercios.map((row) =>
    mapClienteBase(row, metricasPor.get(row.id as string) ?? [], ventasPor.get(row.id as string) ?? []),
  );
}

/** Da de alta una sucursal nueva colgada de `cuentaId`. Hereda de la cuenta
 * los campos que son de cuenta (plan, estado, fee, contacto, tono de marca,
 * email de notificaciones) — copiados a la fila por completitud del schema,
 * pero nunca se leen desde ahí: siempre se resuelven contra la raíz (ver
 * resolverCuenta). Lo único propio de la sucursal es nombre/rubro/zona/
 * ficha de Google — cada local tiene la suya. */
export async function crearSucursal(
  cuentaId: string,
  datos: { nombre: string; rubro: Rubro; zona: Zona; googlePlaceId?: string; googleReviewUrl?: string; busquedaClave?: string },
): Promise<Cliente> {
  const cuenta = await getCliente(cuentaId);
  if (!cuenta) throw new Error(`Cuenta no encontrada: ${cuentaId}`);
  if (cuenta.comercioPadreId) throw new Error("Una sucursal no puede tener sucursales propias.");
  return crearCliente({
    nombre: datos.nombre,
    rubro: datos.rubro,
    zona: datos.zona,
    googlePlaceId: datos.googlePlaceId ?? "",
    googleReviewUrl: datos.googleReviewUrl ?? "",
    busquedaClave: datos.busquedaClave ?? "",
    plan: cuenta.plan,
    estado: cuenta.estado,
    contacto: cuenta.contacto,
    fee: cuenta.fee,
    tonoMarca: cuenta.tonoMarca,
    fechaAlta: new Date().toISOString().slice(0, 10),
    comercioPadreId: cuentaId,
  });
}

/** Resuelve la fila "cuenta" de un comercio: si `c` ya es una cuenta (sin
 * padre) se devuelve tal cual; si es una sucursal, se busca y devuelve la
 * raíz. Usar para leer SIEMPRE los campos de cuenta (codigoAcceso, plan,
 * fee, contacto, tonoMarca, emailNotificaciones, autoResponder*, WhatsApp)
 * — nunca leerlos directo de un comercio que podría ser una sucursal. */
export async function resolverCuenta(c: Cliente): Promise<Cliente> {
  if (!c.comercioPadreId) return c;
  const raiz = await getCliente(c.comercioPadreId);
  if (!raiz) throw new Error(`Cuenta raíz no encontrada para sucursal ${c.id}`);
  return raiz;
}

export async function actualizarCliente(
  id: string,
  datos: Partial<Omit<Cliente, "id" | "ventasNFC" | "historico">>,
): Promise<Cliente> {
  // Un solo UPDATE atómico: cada campo ausente conserva su valor actual en
  // SQL. El viejo leer-mezclar-escribir en JS permitía que dos ediciones
  // concurrentes se pisaran (lost update).
  const rows = await sql`
    UPDATE comercios SET
      codigo_acceso = ${datos.codigoAcceso === undefined ? sql`codigo_acceso` : datos.codigoAcceso},
      nombre = ${datos.nombre === undefined ? sql`nombre` : datos.nombre},
      rubro = ${datos.rubro === undefined ? sql`rubro` : datos.rubro},
      zona = ${datos.zona === undefined ? sql`zona` : datos.zona},
      plan = ${datos.plan === undefined ? sql`plan` : datos.plan},
      estado = ${datos.estado === undefined ? sql`estado` : datos.estado},
      contacto = ${datos.contacto === undefined ? sql`contacto` : datos.contacto},
      google_review_url = ${datos.googleReviewUrl === undefined ? sql`google_review_url` : limpiarUrl(datos.googleReviewUrl)},
      busqueda_clave = ${datos.busquedaClave === undefined ? sql`busqueda_clave` : datos.busquedaClave},
      fee = ${datos.fee === undefined ? sql`fee` : datos.fee},
      tono_marca = ${datos.tonoMarca === undefined ? sql`tono_marca` : datos.tonoMarca},
      google_place_id = ${datos.googlePlaceId === undefined ? sql`google_place_id` : datos.googlePlaceId},
      google_location = ${datos.googleLocation === undefined ? sql`google_location` : datos.googleLocation},
      email_notificaciones = ${datos.emailNotificaciones === undefined ? sql`email_notificaciones` : datos.emailNotificaciones}
    WHERE id = ${id}
    RETURNING id
  `;
  if (rows.length === 0) throw new Error(`Comercio no encontrado: ${id}`);
  const c = await getCliente(id);
  if (!c) throw new Error(`Comercio no encontrado: ${id}`);
  return c;
}

/** Borra el cliente y todo lo que dependía de él (reseñas, links, taps,
 * métricas, feedback, checklist, audits, competencia) — encadenado por
 * ON DELETE CASCADE en el schema. No se puede deshacer. */
export async function eliminarCliente(id: string): Promise<void> {
  await sql`DELETE FROM comercios WHERE id = ${id}`;
}
