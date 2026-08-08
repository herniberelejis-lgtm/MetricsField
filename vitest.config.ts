import { defineConfig } from "vitest/config";
import path from "node:path";

// Los módulos de seguridad importan "server-only", que es un stub que Next
// resuelve en build para que nadie los importe desde un componente cliente.
// Fuera de Next ese import explota, así que acá lo apuntamos a un archivo
// vacío — es exactamente lo que hace Next del lado del servidor.
export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
