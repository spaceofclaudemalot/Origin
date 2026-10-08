import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-extension-files",
      writeBundle() {
        copyFileSync("manifest.json", "dist/manifest.json");
        if (existsSync("public")) {
          if (!existsSync("dist/public")) mkdirSync("dist/public", { recursive: true });
          for (const file of readdirSync("public")) {
            copyFileSync(`public/${file}`, `dist/public/${file}`);
          }
        }
      }
    }
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        editor: resolve(__dirname, "src/editor/index.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});