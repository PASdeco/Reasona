import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    target: "vercel",
    nitro: {
      preset: "vercel",
    },
    server: { entry: "server" },
  },
});
