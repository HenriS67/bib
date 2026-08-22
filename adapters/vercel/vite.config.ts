import { nodeServerAdapter } from "@builder.io/qwik-city/adapters/node-server/vite";
import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config";

export default extendConfig(baseConfig, () => ({
  build: {
    ssr: true,
    rollupOptions: {
      input: ["src/entry.vercel.tsx", "@qwik-city-plan"],
    },
    outDir: ".vercel/output/functions/_qwik-city.func",
  },
  ssr: {
    noExternal: ["drizzle-orm", "postgres", "undici"],
  },
  plugins: [nodeServerAdapter()],
}));