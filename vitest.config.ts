import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["libs/dbviewer/**/*.test.ts", "libs/unixtime/**/*.test.ts", "libs/cron/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    globals: false,
  },
});
