import "server-only";

// Capa de acceso a datos: Postgres puro (sin ORM), consultas en SQL directo
// vía el driver `postgres`. Cada función mapea filas de snake_case (columnas
// SQL) a los tipos camelCase de lib/types.ts.
//
// Este archivo es un barrel: el código real vive partido por dominio bajo
// lib/db/ (ver esa carpeta), acá solo se reexporta todo para que ningún
// import existente (`@/lib/db`) se entere del split.

export * from "./db/clientes";
export * from "./db/google-sync";
export * from "./db/ajustes";
export * from "./db/metricas";
export * from "./db/links";
export * from "./db/resenas";
export * from "./db/checklist";
export * from "./db/audits";
export * from "./db/competencia";
export * from "./db/admins";
export * from "./db/auditoria";
export * from "./db/resumen";
