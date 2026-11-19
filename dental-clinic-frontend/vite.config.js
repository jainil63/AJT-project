import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  return {
    base: "/",
    ssr: {
      target: "webworker",
      external: true,
    },
    css: {
      transformer: "lightningcss",
      lightningcss: {
        targets: browserslistToTargets(browserslist("> 0.25%")),
        cssModules: {},
      },
    },
    build: {
      rolldownOptions: {},
      target: "esnext",
      sourcemap: false,
      cssCodeSplit: true,
      cssMinify: "lightningcss",
      minify: "terser",
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "xlsx-vendor": ["xlsx"],
            "utils-vendor": ["axios", "date-fns", "lucide-react"],
          },
        },
      },
      terserOptions: {
        sourceMap: false,
        compress: {
          // pure_funcs: ['console.log'],
          drop_console: true,
          drop_debugger: true,
        },
        mangle: true,
        format: {
          comments: false, // Remove comments
        },
      },
    },
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: 9432,
      forwardConsole: {
        unhandledErrors: true,
        logLevels: ["warn", "error"],
      },
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL,
          changeOrigin: true,
          secure: mode !== 'development',
          ws: true,
          timeout: 0,
          proxyTimeout: 0,
          configure: (proxy) => {
            proxy.on('error', (err, req) => {
              // ECONNRESET: an SSE/WebSocket client disconnected (tab close,
              //   page reload, HMR). Expected — not a real failure.
              // ECONNREFUSED: backend was momentarily unavailable (restarting
              //   after a code change or migration). Resolves on its own.
              if (err?.code === 'ECONNRESET' || err?.code === 'ECONNREFUSED') return;
              console.warn(`[vite proxy] ${req?.url || ''} → ${err?.code || err?.message}`);
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
