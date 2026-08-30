import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@data": new URL("./data", import.meta.url).pathname
    }
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts"],
      thresholds: {
        branches: 75,
        functions: 85,
        lines: 85,
        statements: 85
      }
    }
  }
});
