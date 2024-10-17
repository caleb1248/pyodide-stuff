import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    include: ["synclink"],
  },
  plugins: [
    {
      name: "coi-stuff",

      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      },
    },
  ],
});
