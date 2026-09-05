import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    css: true,
    include: [
      "src/fantasy420/app/Draft/2026.test.ts",
      "src/fantasy420/app/Draft/composite.test.ts",
      "src/fantasy420/app/Draft/midrank.test.ts",
      "src/fantasy420/app/Draft/mockDraft.test.ts",
      "src/fantasy420/app/Draft/rookies.test.ts",
      "src/fantasy420/app/Wrapped/tabs/DraftDayReachesAndSteals.test.tsx",
      "src/fantasy420/app/Wrapped/tabs/PlayerStats/Chart.test.tsx",
    ],
  },
});
