import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readdirSync } from "fs";
import { join } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "video-scanner",
      configureServer(server) {
        server.middlewares.use("/api/videos", (req, res, next) => {
          if (req.method === "GET") {
            try {
              const artDir = join(__dirname, "public", "art");
              const files = readdirSync(artDir);

              // Filter for video files
              const videoFiles = files.filter((file) => {
                const ext = file.toLowerCase().split(".").pop();
                return ["mp4", "webm", "ogg"].includes(ext || "");
              });

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(videoFiles));
            } catch (error) {
              console.error("Error scanning video directory:", error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: "Failed to scan videos" }));
            }
          } else {
            next();
          }
        });
      },
    },
  ],
  publicDir: "public",
  build: {
    assetsDir: "assets",
    rollupOptions: {
      external: [],
    },
  },
});
