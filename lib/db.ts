import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Cliente, MetricaMensual, VentaNFC } from "./types";
import { seedClientes } from "./seed";

// Base de datos del proyecto: un archivo JSON versionado en el repo
// (data/db.json). Sin servicios externos: corre igual en cualquier máquina
// y el historial queda respaldado en git con cada push.
//
// Si el archivo no existe (clon nuevo), se crea a partir de lib/seed.ts.

const DB_PATH = path.join(process.cwd(), "data", "db.json");

interface DbShape {
  clientes: Cliente[];
}

// En Vercel (serverless) el filesystem es de solo lectura: los datos se
// editan en tu PC y viajan al deploy con cada `git push`. Este guard evita
// un error críptico si se intenta escribir desde el sitio publicado.
const SOLO_LECTURA = !!process.env.VERCEL;

function persist(db: DbShape): void {
  if (SOLO_LECTURA) {
    throw new Error(
      "Este deploy es de solo lectura. Cargá los datos desde tu PC (npm run dev) y publicalos con git push.",
    );
  }
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_PATH); // escritura atómica: nunca queda un JSON a medias
}

function load(): DbShape {
  if (!fs.existsSync(DB_PATH)) {
    const db: DbShape = { clientes: seedClientes };
    if (!SOLO_LECTURA) persist(db); // en read-only servimos el seed en memoria
    return db;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as DbShape;
}

// ---------- Lectura ----------

export function getClientes(): Cliente[] {
  return load().clientes;
}

export function getCliente(id: string): Cliente | undefined {
  return load().clientes.find((c) => c.id === id);
}

export function getClientePorCodigo(codigo: string): Cliente | undefined {
  if (!codigo) return undefined;
  return load().clientes.find((c) => c.codigoAcceso === codigo);
}

// ---------- Escritura ----------

export function generarCodigo(): string {
  return crypto.randomBytes(4).toString("hex");
}

function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function crearCliente(
  datos: Omit<Cliente, "id" | "codigoAcceso" | "ventasNFC" | "historico">,
): Cliente {
  const db = load();
  let id = slugify(datos.nombre) || "cliente";
  while (db.clientes.some((c) => c.id === id)) {
    id = `${id}-${crypto.randomBytes(2).toString("hex")}`;
  }
  const nuevo: Cliente = {
    ...datos,
    id,
    codigoAcceso: generarCodigo(),
    ventasNFC: [],
    historico: [],
  };
  db.clientes.push(nuevo);
  persist(db);
  return nuevo;
}

export function actualizarCliente(
  id: string,
  datos: Partial<Omit<Cliente, "id" | "ventasNFC" | "historico">>,
): Cliente {
  const db = load();
  const c = db.clientes.find((x) => x.id === id);
  if (!c) throw new Error(`Cliente no encontrado: ${id}`);
  Object.assign(c, datos);
  persist(db);
  return c;
}

/** Crea o reemplaza la métrica del mes indicado; mantiene el histórico ordenado. */
export function guardarMetrica(id: string, metrica: MetricaMensual): Cliente {
  const db = load();
  const c = db.clientes.find((x) => x.id === id);
  if (!c) throw new Error(`Cliente no encontrado: ${id}`);
  c.historico = [
    ...c.historico.filter((h) => h.mes !== metrica.mes),
    metrica,
  ].sort((a, b) => a.mes.localeCompare(b.mes));
  persist(db);
  return c;
}

export function eliminarMetrica(id: string, mes: string): Cliente {
  const db = load();
  const c = db.clientes.find((x) => x.id === id);
  if (!c) throw new Error(`Cliente no encontrado: ${id}`);
  c.historico = c.historico.filter((h) => h.mes !== mes);
  persist(db);
  return c;
}

export function registrarVentaNFC(id: string, venta: VentaNFC): Cliente {
  const db = load();
  const c = db.clientes.find((x) => x.id === id);
  if (!c) throw new Error(`Cliente no encontrado: ${id}`);
  c.ventasNFC = [...c.ventasNFC, venta].sort((a, b) =>
    a.fecha.localeCompare(b.fecha),
  );
  persist(db);
  return c;
}

export function regenerarCodigo(id: string): Cliente {
  return actualizarCliente(id, { codigoAcceso: generarCodigo() });
}
