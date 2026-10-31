import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
    maxWorkers: 4,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: [
        "lib/**/*.ts",
        "hooks/use-*.ts",
        "components/{ui,assistant,planner-app}.tsx",
        "components/{forms,workspace}/**/*.tsx",
        "components/views/**/*.tsx",
      ],
      exclude: [
        "lib/connector*",
        "hooks/use-mobile.ts",
        "lib/db.ts",
        "lib/utils.ts",
        "lib/planner.ts",
      ],
      reportsDirectory: "coverage",
      thresholds: {
        lines: 85,
        statements: 84,
        branches: 76,
        functions: 70,
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
