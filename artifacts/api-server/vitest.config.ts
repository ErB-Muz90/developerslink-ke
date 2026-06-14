import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@workspace/api-zod": path.resolve(__dirname, "../../lib/api-zod/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
  },
});
