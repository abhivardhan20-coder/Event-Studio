import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "lib/**/*.ts",
        "hooks/use-{ai-status,planner-store}.ts",
        "components/{forms,ui,assistant,planner-app}.tsx",
        "components/views/**/*.tsx",
      ],
      exclude: [
        "lib/connector*",
        "lib/db.ts",
        "lib/utils.ts",
        "lib/planner.ts",
      ],
      reportsDirectory: "coverage",
      thresholds: {
        lines: 80,
        statements: 78,
        branches: 68,
        functions: 64,
        "lib/server/planner-api.ts": {
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 95,
        },
      },
    },
  },
});
