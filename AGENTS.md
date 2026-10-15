# AGENTS.md

Punto de entrada para agentes de IA en este repositorio (Cursor, Codex, Copilot,
Amp, Claude Code y cualquier otro que lea este archivo).

Este archivo **no duplica** las instrucciones: dice dónde están.

## Leé esto primero

| Archivo | Cuándo |
|---|---|
| **`CLAUDE.md`** (raíz) | Siempre. Qué es el proyecto, arquitectura, reglas críticas, flujo de ramas, comandos. Aplica a todos los agentes, pese al nombre. |
| **`docs/LOYALTY-TRASPASO.md`** | Si vas a trabajar en Loyalty en una sesión nueva: **empezá por acá**. La situación real de hoy (código, Neon, Vercel), qué falta, qué decide el dueño y cómo trabajar con él. Trae un prompt de arranque. |
| **`docs/LOYALTY-PARA-AGENTES.md`** | Antes de tocar cualquier cosa de Loyalty: `app/(loyalty)/`, `lib/loyalty*.ts`, `lib/db/loyalty.ts`, `lib/wallet/`, las migraciones de Loyalty, y las acciones y pantallas de Loyalty de `app/admin/` y `app/portal/`. |
| **`docs/LOYALTY-ESTADO.md`** | Qué se probó, qué falta y qué pasos manuales quedan (Neon, Vercel, Google). |
| **`docs/LOYALTY-PRODUCTO-COMPLETO.md`** | Para entender el producto y el modelo de negocio, no el código. |
| **`docs/CONTEXTO-Y-PROGRESO.md`** | Contexto general del proyecto. |

## Lo mínimo que no se rompe

Está todo explicado en los archivos de arriba, pero si solo leés esto:

- **El idioma del proyecto es español.** Comentarios, commits, nombres de
  dominio, UI y documentación.
- **Nunca saques `prepare: false`** de `lib/sql.ts`. Neon corre en modo pooler y
  los prepared statements rompen de forma aleatoria.
- **Los cambios de esquema no se auto-aplican.** Se entregan como un `.sql`
  nuevo en `db/migrations/` para correr a mano en Neon, y también se reflejan en
  `db/schema.sql`. Nunca asumas que una migración ya se corrió.
- **Ningún `DROP` ni `DELETE` masivo** sin avisar y confirmar antes. Ya hubo una
  pérdida de datos real por esto.
- **Nunca pushees directo a `main` ni a `desarrollo`.** Rama propia + PR.
- **No borres un test para que pase un cambio.** Si un test se pone rojo, el
  cambio está mal.
- **Loyalty usa la misma base y el mismo rol que Reviews.** No hay aislamiento
  por permisos de base de datos: el aislamiento entre comercios lo hace el
  código, y toda consulta de Loyalty tiene que filtrar por `comercio_id`. Ver
  `docs/LOYALTY-PARA-AGENTES.md` §2.1 antes de escribir cualquier query.
- **Los datos personales de Loyalty no están cifrados.** No lo des a entender en
  ningún texto, y nunca los loguees. Ver `docs/LOYALTY-PARA-AGENTES.md` §2.6.

## Ramas que no son esta

Existió otra implementación de Loyalty (PR #118 y los #114, #115, #116, rama
`claude/loyalty-l5-canje`) con una base de datos separada y otro conjunto de
migraciones. **Está descartada.** No copies código ni reglas de ahí: si ves
`LOYALTY_DATABASE_URL`, `sqlLoyalty` o `app_loyalty`, es de esa línea y acá no
aplica.

## Ciclo de verificación

Las cuatro tienen que pasar antes de commitear. El CI corre lo mismo, más un job
con Postgres real (`scripts/prueba-permisos.mjs`).

```bash
npx tsc --noEmit
npm test
npm run build
npm run lint
```
