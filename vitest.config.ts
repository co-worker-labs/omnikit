import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "libs/dbviewer/**/*.test.ts",
      "libs/unixtime/**/*.test.ts",
      "libs/cron/**/*.test.ts",
      "libs/qrcode/**/*.test.ts",
      "libs/textcase/**/*.test.ts",
      "libs/color/**/*.test.ts",
      "libs/regex/**/*.test.ts",
      "libs/csv/**/*.test.ts",
      "libs/numbase/**/*.test.ts",
      "libs/image/**/*.test.ts",
      "libs/extractor/**/*.test.ts",
      "libs/password/**/*.test.ts",
      "libs/wordcounter/**/*.test.ts",
      "libs/__tests__/*.test.ts",
      "hooks/**/*.test.ts",
    ],
    environment: "node",
    pool: "forks",
    globals: false,
  },
});
