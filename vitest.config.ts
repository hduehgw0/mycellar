import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // tsconfig の paths（@/* → src/*）を Vitest でも解決する。
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
});
