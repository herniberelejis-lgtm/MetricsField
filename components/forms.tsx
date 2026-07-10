import type { ReactNode } from "react";
import type { Cliente } from "@/lib/types";
import GooglePlaceIdField from "@/components/GooglePlaceIdField";

// Primitivas de formulario (server-safe) + el formulario de cliente
// compartido entre alta y edición.

export const RUBROS = [
  "Peluquería / Barbería",
  "Restaurante / Bar",
  "Clínica / Consultorio",
  "Taller mecánico",
  "Veterinaria",
  "Gimnasio",
  "Estética",
  "Otro",
] as const;

export const ZONAS = [
  "Güemes",
  "Nueva Córdoba",
  "Alberdi",
  "General Paz",
  "Cerro de las Rosas",
  "Otra",
] as const;

export const PLANES = ["Base", "Premium"] as const;
export const ESTADOS = ["prospecto", "activo", "pausado", "baja"] as const;
export const FORMATOS_NFC = [
  "Sticker",
  "Tarjeta PVC",
  "Standee",
  "Pack completo",
] as const;

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
    >
      {children}
    </button>
  );
}

/** Formulario de cliente: sin `cliente` es alta; con `cliente`, edición. */
export function ClienteForm({
  action,
  cliente,
}: {
  action: (fd: FormData) => Promise<void>;
  cliente?: Cliente;
}) {
  return (
    <form action={action} className="space-y-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <Field label="Nombre del negocio">
        <input
          name="nombre"
          required
          defaultValue={cliente?.nombre}
          placeholder="Barbería El Corte — Güemes"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Rubro">
          <select name="rubro" defaultValue={cliente?.rubro} className={inputCls}>
            {RUBROS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Zona">
          <select name="zona" defaultValue={cliente?.zona} className={inputCls}>
            {ZONAS.map((z) => (
              <option key={z}>{z}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Plan">
          <select name="plan" defaultValue={cliente?.plan} className={inputCls}>
            {PLANES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select
            name="estado"
            defaultValue={cliente?.estado ?? "activo"}
            className={inputCls}
          >
            {ESTADOS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Contacto (WhatsApp)">
          <input
            name="contacto"
            defaultValue={cliente?.contacto}
            placeholder="+54 351 555 0000"
            className={inputCls}
          />
        </Field>
        <Field label="Abono mensual (ARS)">
          <input
            name="fee"
            type="number"
            min={0}
            step={1000}
            required
            defaultValue={cliente?.fee}
            placeholder="55000"
            className={inputCls}
          />
        </Field>
      </div>

      <Field
        label="Email de notificaciones"
        hint="A dónde le avisamos por mail cuando le entra una reseña mala o una queja privada. Vacío = no se manda nada."
      >
        <input
          name="emailNotificaciones"
          type="email"
          defaultValue={cliente?.emailNotificaciones}
          placeholder="dueño@sunegocio.com"
          className={inputCls}
        />
      </Field>

      <Field
        label="Link de reseñas de Google"
        hint="El mismo link que programás en la tarjeta NFC del cliente."
      >
        <input
          name="googleReviewUrl"
          type="url"
          defaultValue={cliente?.googleReviewUrl}
          placeholder="https://g.page/r/…/review"
          className={inputCls}
        />
      </Field>

      <Field
        label="Google Place ID"
        hint="Opcional. Con esto cargado, el rating y las reseñas se actualizan solos todos los días."
      >
        <GooglePlaceIdField defaultValue={cliente?.googlePlaceId} />
      </Field>

      <Field
        label="Tono de marca"
        hint="Lo usa el generador de respuestas sugeridas del CRM."
      >
        <select name="tonoMarca" defaultValue={cliente?.tonoMarca ?? "cercano"} className={inputCls}>
          <option value="cercano">Cercano</option>
          <option value="formal">Formal</option>
        </select>
      </Field>

      <Field
        label="Búsqueda clave"
        hint="Cómo lo buscaría un cliente — se usa para armar las preguntas del Audit GEO."
      >
        <input
          name="busquedaClave"
          defaultValue={cliente?.busquedaClave}
          placeholder="barbería en Güemes"
          className={inputCls}
        />
      </Field>

      {!cliente && (
        <Field label="Fecha de alta">
          <input
            name="fechaAlta"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={inputCls}
          />
        </Field>
      )}

      <div className="pt-2">
        <SubmitButton>
          {cliente ? "Guardar cambios" : "Crear cliente"}
        </SubmitButton>
      </div>
    </form>
  );
}
