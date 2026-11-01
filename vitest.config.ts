import path from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "vitest/config";

try {
  loadEnvFile(".env");
} catch {
  // no .env: tests that need the database will say so
}

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // Tests share one Postgres database, so files run one at a time.
  test: { environment: "node", include: ["src/**/*.test.{ts,tsx}"], fileParallelism: false },
});
