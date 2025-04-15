import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    server: {
      https: {
        key: fs.readFileSync("key.pem"),
        cert: fs.readFileSync("cert.pem")
      },
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: `${env.VITE_API_URL}`,
          changeOrigin: true
        },
        "/storage": {
          target: `${env.VITE_API_URL}`,
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [react()],
    define: {
      global: "window"
    }
  };
});
