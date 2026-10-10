import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Le test de performance a sa propre commande (npm run test:perf)
    exclude: [...configDefaults.exclude, "**/*.perf.test.ts"],
  },
});
