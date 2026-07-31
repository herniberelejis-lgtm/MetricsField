import type { Config } from "tailwindcss";

// Paleta de marca (ver Manual de Marca MetricsField): monocromática con
// negro/blanco como base, grises funcionales F7F7F7/EAEAEA/1A1A1A, y tres
// colores secundarios (azul niebla, verde suave, rojo suave) reservados
// para métricas e indicadores — nunca decorativos.
//
// En vez de tocar cientos de clases `bg-slate-*`, `text-emerald-*`, etc. en
// cada página, se sobreescriben directamente las escalas de Tailwind que ya
// usa toda la app. Así el mismo `bg-slate-50` / `text-emerald-600` de
// siempre pasa a ser un gris o un verde de marca en todos lados a la vez.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#000000",
          fg: "#000000",
        },
        // Escala neutra de marca (reemplaza "slate" en todo el sitio).
        slate: {
          50: "#F7F7F7",
          100: "#F0F0F0",
          200: "#EAEAEA",
          300: "#D6D6D6",
          400: "#ADADAD",
          500: "#8A8A8A",
          600: "#666666",
          700: "#4D4D4D",
          800: "#333333",
          900: "#1A1A1A",
          950: "#0D0D0D",
        },
        // Azul niebla: métricas, datos primarios.
        blue: {
          50: "#F4F7FB",
          100: "#E8EFF6",
          200: "#C8D8E8",
          300: "#AEC6DE",
          400: "#8CAECE",
          500: "#5C86B8",
          600: "#3D5A80",
          700: "#31486A",
        },
        // Verde suave: indicadores positivos.
        emerald: {
          50: "#F1F8F3",
          100: "#C9E3D1",
          200: "#B3D9BE",
          300: "#8FC69F",
          400: "#5FA876",
          500: "#3F9A6B",
          600: "#2F6D4D",
          700: "#255A3F",
        },
        // Rojo suave: indicadores negativos.
        rose: {
          50: "#FBF1F1",
          100: "#ECC9C9",
          200: "#E3B3B3",
          300: "#D69B9B",
          400: "#C97C7C",
          500: "#B15E5E",
          600: "#8A3B3B",
          700: "#6E2E2E",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-montserrat)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
