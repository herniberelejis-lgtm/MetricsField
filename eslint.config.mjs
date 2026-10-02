import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

// Config de `npm run lint`: las reglas recomendadas de Next.js (incluye
// React, hooks y Core Web Vitals) + las de TypeScript que trae
// eslint-config-next. Sin este archivo, `next lint` se quedaba esperando
// una respuesta interactiva y nunca corría.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts", "brag-output/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Los textos de la UI están en español y citan cosas entre comillas
      // ("Mi Rating en Google"). React ya escapa el texto de JSX, así que
      // esto es solo estilo — no un riesgo de inyección.
      "react/no-unescaped-entities": "off",
    },
  },
];
