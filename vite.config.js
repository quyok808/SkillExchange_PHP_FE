import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

// https://vite.dev/config/
export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync("key.pem"), // Đường dẫn đến key.pem
      cert: fs.readFileSync("cert.pem") // Đường dẫn đến cert.pem
    },
    host: "0.0.0.0", // Cho phép truy cập từ thiết bị khác
    port: 5173,
    proxy: {
      "/api": {
        target: "http://192.168.1.8:5008",
        changeOrigin: true
      },
      "/storage": {
        target: "http://192.168.1.8:5008", // Proxy cả /storage sang API server
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [react()],
  define: {
    global: "window" // Gán global thành window trong trình duyệt
  }
});
