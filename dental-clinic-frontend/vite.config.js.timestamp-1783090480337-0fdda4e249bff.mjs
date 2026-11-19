// vite.config.js
import tailwindcss from "file:///D:/Work/Swaminarayan%20dental%20CRM/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///D:/Work/Swaminarayan%20dental%20CRM/frontend/node_modules/@vitejs/plugin-react-swc/index.js";
import browserslist from "file:///D:/Work/Swaminarayan%20dental%20CRM/frontend/node_modules/browserslist/index.js";
import { browserslistToTargets } from "file:///D:/Work/Swaminarayan%20dental%20CRM/frontend/node_modules/lightningcss/node/index.mjs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "file:///D:/Work/Swaminarayan%20dental%20CRM/frontend/node_modules/vite/dist/node/index.js";
import { VitePWA } from "file:///D:/Work/Swaminarayan%20dental%20CRM/frontend/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/Work/Swaminarayan%20dental%20CRM/frontend/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  return {
    base: "/",
    ssr: {
      target: "webworker",
      external: true
    },
    css: {
      transformer: "lightningcss",
      lightningcss: {
        targets: browserslistToTargets(browserslist("> 0.25%")),
        cssModules: {}
      }
    },
    build: {
      rolldownOptions: {},
      target: "esnext",
      sourcemap: false,
      cssCodeSplit: true,
      cssMinify: "lightningcss",
      minify: "terser",
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1e3,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "leaflet-vendor": ["leaflet", "react-leaflet"],
            "xlsx-vendor": ["xlsx"],
            "utils-vendor": ["axios", "date-fns", "lucide-react"]
          }
        }
      },
      terserOptions: {
        sourceMap: false,
        compress: {
          // pure_funcs: ['console.log'],
          drop_console: true,
          drop_debugger: true
        },
        mangle: true,
        format: {
          comments: false
          // Remove comments
        }
      }
    },
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"]
        }
      }),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["apple-touch-icon.png", "pwa-192x192.png"],
        manifest: {
          name: "Swaminarayan Dental Clinic",
          short_name: "SDC",
          description: "Clinic management frontend for Swaminarayan Dental Clinic.",
          theme_color: "#0b4f6c",
          background_color: "#ffffff",
          display: "standalone",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "/pwa-512x512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff2}"],
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
        },
        devOptions: {
          enabled: false,
          type: "module"
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      },
      dedupe: ["react", "react-dom"]
    },
    server: {
      port: 9432,
      forwardConsole: {
        unhandledErrors: true,
        logLevels: ["warn", "error"]
      },
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: mode !== "development",
          ws: true,
          // SSE endpoints (e.g. /api/lead-offer/stream) are long-lived. The
          // default 2-minute timeout would tear down the stream mid-session
          // and pollute the dev console with ECONNRESET on every reconnect.
          timeout: 0,
          proxyTimeout: 0,
          configure: (proxy) => {
            proxy.on("error", (err, req) => {
              if (err?.code === "ECONNRESET" || err?.code === "ECONNREFUSED") return;
              console.warn(`[vite proxy] ${req?.url || ""} \u2192 ${err?.code || err?.message}`);
            });
          }
        }
      }
    },
    preview: {
      port: 9432
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxXb3JrXFxcXFN3YW1pbmFyYXlhbiBkZW50YWwgQ1JNXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxXb3JrXFxcXFN3YW1pbmFyYXlhbiBkZW50YWwgQ1JNXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9Xb3JrL1N3YW1pbmFyYXlhbiUyMGRlbnRhbCUyMENSTS9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IGJyb3dzZXJzbGlzdCBmcm9tIFwiYnJvd3NlcnNsaXN0XCI7XHJcbmltcG9ydCB7IGJyb3dzZXJzbGlzdFRvVGFyZ2V0cyB9IGZyb20gXCJsaWdodG5pbmdjc3NcIjtcclxuaW1wb3J0IHBhdGgsIHsgZGlybmFtZSB9IGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tIFwidXJsXCI7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tIFwidml0ZS1wbHVnaW4tcHdhXCI7XHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xyXG5jb25zdCBfX2Rpcm5hbWUgPSBkaXJuYW1lKF9fZmlsZW5hbWUpO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgX19kaXJuYW1lLCBcIlwiKTtcclxuICByZXR1cm4ge1xyXG4gICAgYmFzZTogXCIvXCIsXHJcbiAgICBzc3I6IHtcclxuICAgICAgdGFyZ2V0OiBcIndlYndvcmtlclwiLFxyXG4gICAgICBleHRlcm5hbDogdHJ1ZSxcclxuICAgIH0sXHJcbiAgICBjc3M6IHtcclxuICAgICAgdHJhbnNmb3JtZXI6IFwibGlnaHRuaW5nY3NzXCIsXHJcbiAgICAgIGxpZ2h0bmluZ2Nzczoge1xyXG4gICAgICAgIHRhcmdldHM6IGJyb3dzZXJzbGlzdFRvVGFyZ2V0cyhicm93c2Vyc2xpc3QoXCI+IDAuMjUlXCIpKSxcclxuICAgICAgICBjc3NNb2R1bGVzOiB7fSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICByb2xsZG93bk9wdGlvbnM6IHt9LFxyXG4gICAgICB0YXJnZXQ6IFwiZXNuZXh0XCIsXHJcbiAgICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcclxuICAgICAgY3NzTWluaWZ5OiBcImxpZ2h0bmluZ2Nzc1wiLFxyXG4gICAgICBtaW5pZnk6IFwidGVyc2VyXCIsXHJcbiAgICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiBmYWxzZSxcclxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxyXG4gICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgICBtYW51YWxDaHVua3M6IHtcclxuICAgICAgICAgICAgXCJyZWFjdC12ZW5kb3JcIjogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC1yb3V0ZXItZG9tXCJdLFxyXG4gICAgICAgICAgICBcImxlYWZsZXQtdmVuZG9yXCI6IFtcImxlYWZsZXRcIiwgXCJyZWFjdC1sZWFmbGV0XCJdLFxyXG4gICAgICAgICAgICBcInhsc3gtdmVuZG9yXCI6IFtcInhsc3hcIl0sXHJcbiAgICAgICAgICAgIFwidXRpbHMtdmVuZG9yXCI6IFtcImF4aW9zXCIsIFwiZGF0ZS1mbnNcIiwgXCJsdWNpZGUtcmVhY3RcIl0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHRlcnNlck9wdGlvbnM6IHtcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGNvbXByZXNzOiB7XHJcbiAgICAgICAgICAvLyBwdXJlX2Z1bmNzOiBbJ2NvbnNvbGUubG9nJ10sXHJcbiAgICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsXHJcbiAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbWFuZ2xlOiB0cnVlLFxyXG4gICAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgICAgY29tbWVudHM6IGZhbHNlLCAvLyBSZW1vdmUgY29tbWVudHNcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgcmVhY3Qoe1xyXG4gICAgICAgIGJhYmVsOiB7XHJcbiAgICAgICAgICBwbHVnaW5zOiBbXCJiYWJlbC1wbHVnaW4tcmVhY3QtY29tcGlsZXJcIl0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICAgIHRhaWx3aW5kY3NzKCksXHJcbiAgICAgIFZpdGVQV0Eoe1xyXG4gICAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICAgIGluY2x1ZGVBc3NldHM6IFsnYXBwbGUtdG91Y2gtaWNvbi5wbmcnLCAncHdhLTE5MngxOTIucG5nJ10sXHJcbiAgICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICAgIG5hbWU6ICdTd2FtaW5hcmF5YW4gRGVudGFsIENsaW5pYycsXHJcbiAgICAgICAgICBzaG9ydF9uYW1lOiAnU0RDJyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2xpbmljIG1hbmFnZW1lbnQgZnJvbnRlbmQgZm9yIFN3YW1pbmFyYXlhbiBEZW50YWwgQ2xpbmljLicsXHJcbiAgICAgICAgICB0aGVtZV9jb2xvcjogJyMwYjRmNmMnLFxyXG4gICAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyNmZmZmZmYnLFxyXG4gICAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxyXG4gICAgICAgICAgc2NvcGU6ICcvJyxcclxuICAgICAgICAgIHN0YXJ0X3VybDogJy8nLFxyXG4gICAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHNyYzogJy9wd2EtMTkyeDE5Mi5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHNyYzogJy9wd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHNyYzogJy9wd2EtNTEyeDUxMi1tYXNrYWJsZS5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgICAgcHVycG9zZTogJ21hc2thYmxlJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsanBnLGpwZWcsd29mZjJ9J10sXHJcbiAgICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL2FwaVxcLy9dLFxyXG4gICAgICAgICAgY2xlYW51cE91dGRhdGVkQ2FjaGVzOiB0cnVlLFxyXG4gICAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxyXG4gICAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXHJcbiAgICAgICAgICBtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogNSAqIDEwMjQgKiAxMDI0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBkZXZPcHRpb25zOiB7XHJcbiAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgIHR5cGU6ICdtb2R1bGUnXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgXSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgICAgfSxcclxuICAgICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiXSxcclxuICAgIH0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgcG9ydDogOTQzMixcclxuICAgICAgZm9yd2FyZENvbnNvbGU6IHtcclxuICAgICAgICB1bmhhbmRsZWRFcnJvcnM6IHRydWUsXHJcbiAgICAgICAgbG9nTGV2ZWxzOiBbXCJ3YXJuXCIsIFwiZXJyb3JcIl0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb3h5OiB7XHJcbiAgICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX0JBQ0tFTkRfVVJMLFxyXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgICAgc2VjdXJlOiBtb2RlICE9PSAnZGV2ZWxvcG1lbnQnLFxyXG4gICAgICAgICAgd3M6IHRydWUsXHJcbiAgICAgICAgICAvLyBTU0UgZW5kcG9pbnRzIChlLmcuIC9hcGkvbGVhZC1vZmZlci9zdHJlYW0pIGFyZSBsb25nLWxpdmVkLiBUaGVcclxuICAgICAgICAgIC8vIGRlZmF1bHQgMi1taW51dGUgdGltZW91dCB3b3VsZCB0ZWFyIGRvd24gdGhlIHN0cmVhbSBtaWQtc2Vzc2lvblxyXG4gICAgICAgICAgLy8gYW5kIHBvbGx1dGUgdGhlIGRldiBjb25zb2xlIHdpdGggRUNPTk5SRVNFVCBvbiBldmVyeSByZWNvbm5lY3QuXHJcbiAgICAgICAgICB0aW1lb3V0OiAwLFxyXG4gICAgICAgICAgcHJveHlUaW1lb3V0OiAwLFxyXG4gICAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHtcclxuICAgICAgICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVyciwgcmVxKSA9PiB7XHJcbiAgICAgICAgICAgICAgLy8gRUNPTk5SRVNFVDogYW4gU1NFL1dlYlNvY2tldCBjbGllbnQgZGlzY29ubmVjdGVkICh0YWIgY2xvc2UsXHJcbiAgICAgICAgICAgICAgLy8gICBwYWdlIHJlbG9hZCwgSE1SKS4gRXhwZWN0ZWQgXHUyMDE0IG5vdCBhIHJlYWwgZmFpbHVyZS5cclxuICAgICAgICAgICAgICAvLyBFQ09OTlJFRlVTRUQ6IGJhY2tlbmQgd2FzIG1vbWVudGFyaWx5IHVuYXZhaWxhYmxlIChyZXN0YXJ0aW5nXHJcbiAgICAgICAgICAgICAgLy8gICBhZnRlciBhIGNvZGUgY2hhbmdlIG9yIG1pZ3JhdGlvbikuIFJlc29sdmVzIG9uIGl0cyBvd24uXHJcbiAgICAgICAgICAgICAgaWYgKGVycj8uY29kZSA9PT0gJ0VDT05OUkVTRVQnIHx8IGVycj8uY29kZSA9PT0gJ0VDT05OUkVGVVNFRCcpIHJldHVybjtcclxuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYFt2aXRlIHByb3h5XSAke3JlcT8udXJsIHx8ICcnfSBcdTIxOTIgJHtlcnI/LmNvZGUgfHwgZXJyPy5tZXNzYWdlfWApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBwcmV2aWV3OiB7XHJcbiAgICAgIHBvcnQ6IDk0MzJcclxuICAgIH1cclxuICB9O1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzVCxPQUFPLGlCQUFpQjtBQUM5VSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxrQkFBa0I7QUFDekIsU0FBUyw2QkFBNkI7QUFDdEMsT0FBTyxRQUFRLGVBQWU7QUFDOUIsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxjQUFjLGVBQWU7QUFDdEMsU0FBUyxlQUFlO0FBUHVLLElBQU0sMkNBQTJDO0FBU2hQLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxRQUFRLFVBQVU7QUFHcEMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxXQUFXLEVBQUU7QUFDdkMsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLE1BQ0gsUUFBUTtBQUFBLE1BQ1IsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLEtBQUs7QUFBQSxNQUNILGFBQWE7QUFBQSxNQUNiLGNBQWM7QUFBQSxRQUNaLFNBQVMsc0JBQXNCLGFBQWEsU0FBUyxDQUFDO0FBQUEsUUFDdEQsWUFBWSxDQUFDO0FBQUEsTUFDZjtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLGlCQUFpQixDQUFDO0FBQUEsTUFDbEIsUUFBUTtBQUFBLE1BQ1IsV0FBVztBQUFBLE1BQ1gsY0FBYztBQUFBLE1BQ2QsV0FBVztBQUFBLE1BQ1gsUUFBUTtBQUFBLE1BQ1Isc0JBQXNCO0FBQUEsTUFDdEIsdUJBQXVCO0FBQUEsTUFDdkIsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFVBQ04sY0FBYztBQUFBLFlBQ1osZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFlBQ3pELGtCQUFrQixDQUFDLFdBQVcsZUFBZTtBQUFBLFlBQzdDLGVBQWUs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
